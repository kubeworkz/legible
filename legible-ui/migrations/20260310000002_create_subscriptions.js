/**
 * Migration: create subscriptions table for Stripe integration
 */
exports.up = async function (knex) {
  await knex.schema.createTable('subscriptions', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').notNullable().unsigned();
    table.string('stripe_customer_id').nullable();
    table.string('stripe_subscription_id').nullable().unique();
    table.string('stripe_price_id').nullable();
    table
      .enum('plan', ['free', 'pro', 'enterprise'])
      .notNullable()
      .defaultTo('free');
    table
      .enum('status', [
        'active',
        'trialing',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
      ])
      .notNullable()
      .defaultTo('active');
    table.string('payment_method_brand').nullable();
    table.string('payment_method_last4').nullable();
    table.timestamp('current_period_start').nullable();
    table.timestamp('current_period_end').nullable();
    table.timestamp('canceled_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['organization_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('subscriptions');
};
