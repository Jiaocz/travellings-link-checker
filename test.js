const { getMemberList, parseMemberList, ping } = require('./index.js');

async function main () {
    console.log("Getting MemberList");
    const memberList = await getMemberList("https://github.js.cool/travellings-link/travellings/raw/master/member.md");

    console.log("Parsing Members");
    const members = parseMemberList(memberList);

    console.log("Checking")
    const invalids = await ping(members, true);
    console.log(invalids);
}

main();