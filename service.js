import fetch from 'node-fetch';

/**
 * Get the raw member list from the project.
 * @param {string} listLink The link of the raw member list.
 * @returns {string} The raw content of the member list to be parsed.
 */
const getMemberList = async (listLink) => {
    const resp = await fetch(listLink);
    const text = await resp.text();
    return text;
}

/**
 * Parse the raw member list to a list of members.
 * @param {string} rawMemberList
 * @returns {{id: string, name: string, link: string}[]}  
 */
const parseMemberList = (rawMemberList) => {
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
const ping = async (memberlist, debugMode = false) => {
    let invalidList = []
    for(const member of memberlist) {
        if(debugMode) {
            console.log("===========================================================");
            console.log(`Checking ${member.name}, ${member.link}`);
        }
        try {
            const resp = await fetch(member.link, {headers: {"User-Agent": "Mozilla/5.0 Travellings-Link HTTP Client"}});
            const body = await resp.text();
            if(body.toLowerCase().indexOf("travelling") === -1) {
                if (debugMode) {
                    console.log(`${member.name}: ${member.link} deleted travelling link`);
                }
                invalidList.push({
                    id: member.id,
                    name: member.name,
                    link: member.link,
                    status: "QUIT *",
                })
            } else if (debugMode) {
                console.log(`${member.name}: ${member.link} OK`);
            }
        } catch (error) {
            if(debugMode) {
                console.log(`${member.name}: ${member.link} has error ${error.code}`);
            }
            invalidList.push({
                id: member.id,
                name: member.name,
                link: member.link,
                status: error.code,
            })
        }
        if(debugMode) {
            console.log("===========================================================\n");
        }
    }
    return invalidList;
}

export default {
    getMemberList,
    parseMemberList,
    ping,
}