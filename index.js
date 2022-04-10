const github = require('@actions/github');
const core = require("@actions/core");
const service = require("./service.js");

async function main () {
    try {
        console.log("Starting...");
        const memberListLink = core.getInput('member-list');
        const repoToken = core.getInput('repo-token');
        const labels = core.getInput('labels');
        const octokit = github.getOctokit(repoToken);
    
        console.log("\nGetting MemberList");
        const memberListRaw = await service.getMemberList(memberListLink);
    
        console.log("\nParsing Members");
        const memberList = service.parseMemberList(memberListRaw);
        console.log(memberList);
    
        console.log("\nChecking")
        const invalidList = await service.ping(memberList);
    
        if(invalidList.length === 0) {
            console.log("Didn't find any members' website is invalid.");
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

console.log("Action started.")
main();