const settings = require("../config/settings");

function isStaff(member) {

    return member.roles.cache.some(role =>
        role.name === settings.roles.staff ||
        role.name === settings.roles.admin
    );

}

function isAdmin(member) {

    return member.roles.cache.some(role =>
        role.name === settings.roles.admin
    );

}

module.exports = {
    isStaff,
    isAdmin
};