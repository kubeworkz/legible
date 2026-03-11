/**
 * Migration: add trial period columns to subscriptions table
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('subscriptions', (table) => {
    table.timestamp('trial_start').nullable();
    table.timestamp('trial_end').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('subscriptions', (table) => {
    table.dropColumn('trial_start');
    table.dropColumn('trial_end');
  });
};
