import service from "./service.js";

console.log("Getting MemberList");
const memberList = await service.getMemberList("https://github.js.cool/travellings-link/travellings/raw/master/member.md");

console.log("Parsing Members");
const members = service.parseMemberList(memberList);

console.log("Checking")
const invalids = await service.ping(members, true);
console.log(invalids);
