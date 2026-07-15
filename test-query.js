const { DataSource } = require('typeorm');
const { Member } = require('./src/entities/member.entity');
const { MemberMembership } = require('./src/entities/member-membership.entity');

async function test() {
    console.log("Checking last member and member_memberships...");
}
test();
