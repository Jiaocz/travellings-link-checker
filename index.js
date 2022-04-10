const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require("node-fetch");

core.info("Action Started 01");

/**
 * Get the raw member list from the project.
 * @param {string} listLink The link of the raw member list.
 * @returns {string} The raw content of the member list to be parsed.
 */
async function getMemberList (listLink)  {
    core.info("\n========== Getting Member List Raw Text ==============");
    const resp = await fetch(listLink);
    const text = await resp.text();
    return text;
}

/**
 * Parse the raw member list to a list of members.
 * @param {string} rawMemberList
 * @returns {{id: string, name: string, link: string}[]}  
 */
function parseMemberList (rawMemberList) {
    core.info("\n========== Parsing Member List ==============");
    const memberList = rawMemberList.split("\n");
    let result = [];
    memberList.forEach(oneLine => {
        if(/^\| [0-9]+ \| .+ \| .+ \| .+ \|$/i.test(oneLine)) {
            const splited = oneLine.split(/\s?\|\s?/);
            if(splited[2] === "LOST" || splited[2] === "SSL" || splited[2] === "ERROR" || splited[2] === "BROKEN" || splited[2] === "QUIT") {
                return;
            }
            result.push({
                id: splited[1],
                name: splited[3],
                link: splited[4],
            })
        }
    })
    result.sort((a, b) => Number.parseInt(a.id) - Number.parseInt(b.id));
    return result;
}

/**
 * Validate if those members' website is valid.
 * @param {{id: string, name: string, link: string}[]} memberlist Member array to check
 * @param {boolean} debugMode Whether to print debug info
 * @returns {{id: string, name: string, link: string, status: string}[]} Invalid member array.
 */
async function ping (memberlist, debugMode = false) {
    core.info("\n========== Checking Members' Website ==============");
    let invalidList = []
    for(const member of memberlist) {
        if(debugMode) {
            core.info("===========================================================");
            core.info(`Checking ${member.name}, ${member.link}`);
        }
        try {
            const resp = await fetch(member.link, {headers: {"User-Agent": "Mozilla/5.0 Travellings-Link HTTP Client"}});
            const body = await resp.text();
            if(body.toLowerCase().indexOf("travelling") === -1) {
                if (debugMode) {
                    core.info(`${member.name}: ${member.link} deleted travelling link`);
                }
                invalidList.push({
                    id: member.id,
                    name: member.name,
                    link: member.link,
                    status: "QUIT *",
                })
            } else if (debugMode) {
                core.info(`${member.name}: ${member.link} OK`);
            }
        } catch (error) {
            if(debugMode) {
                core.info(`${member.name}: ${member.link} has error ${error.code}`);
            }
            invalidList.push({
                id: member.id,
                name: member.name,
                link: member.link,
                status: error.code,
            })
        }
        if(debugMode) {
            core.info("===========================================================\n");
        }
    }
    return invalidList;
}

const service = { getMemberList, parseMemberList, ping };
exports.service = service;

async function main () {
    try {
        core.info("Starting...");
        const memberListLink = core.getInput('member-list');
        const repoToken = core.getInput('repo-token');
        const labels = core.getInput('labels');
        const octokit = github.getOctokit(repoToken);
    
        core.info("\nGetting MemberList");
        const memberListRaw = await service.getMemberList(memberListLink);
    
        core.info("\nParsing Members");
        const memberList = service.parseMemberList(memberListRaw);
        core.info(memberList);
    
        core.info("\nChecking")
        const invalidList = await service.ping(memberList);
    
        if(invalidList.length === 0) {
            core.info("Didn't find any members' website is invalid.");
            process.exit(0);
        }
    
        let issueContent = 
        `## 开往-友联接力 - ${new Date().toLocaleDateString()} 成员检查报告
        
        共有 ${invalidList.length} 位成员的网站出现问题，请维护员检查！\n\n`;
    
        issueContent += 
        `| 序号 | 名称 | 网址 | 检查结果 | 处理状态 |
        | ---- | ---- | ---- | ---- | ---- |\n`;
    
        invalidList.forEach(member => {
            issueContent += `| ${member.id} | ${member.name} | ${member.link} | ${member.status} | - [ ] |\n`;
        });
    
        issueContent += "\n\n**注意1： 结果为\`QUIT *\`的成员检查结果需复查，因为当前的检查仅为简单的检查，如果成员的网站为后渲染网站，将会检查为QUIT *！**";
        issueContent += "\n\n**注意2： 由于是由Github Action提供自动化检测，网站可能因为屏蔽国外IP被检测为无法打开。**";
        issueContent += "\n\n**注意3： 检测用 User Agent 为： \`Mozilla/5.0 Travellings-Link HTTP Client\`，请站长不要屏蔽此 UA**";
    
        let issueTitle = `开往-友联接力 - ${new Date().toLocaleDateString()} 成员检查报告`;
    
        await octokit.issues.create({
            owner: github.context.payload.repository.owner.login,
            repo: github.context.payload.repository.name,
            title: issueTitle,
            body: issueContent,
            labels: labels.split(/,\s*/),
        });
    
    } catch (e) {
        core.setFailed(e.message)
    }
}

core.info("Action started.");
main().then(() => core.info('Action done')).catch(e => core.setFailed(e.message));
