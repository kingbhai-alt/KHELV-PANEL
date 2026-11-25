import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Authenticated Firebase users synced to PostgreSQL
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Persistent lottery draw history (Seeded with 500 JaiClub history + auto-saved live rounds)
export const drawHistory = pgTable(
  'draw_history',
  {
    id: serial('id').primaryKey(),
    gameMode: text('game_mode').notNull(),
    period: text('period').notNull(),
    number: integer('number').notNull(),
    size: text('size').notNull(),
    color: text('color').notNull(),
    source: text('source').notNull().default('live_api'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('draw_history_mode_period_idx').on(table.gameMode, table.period),
  ]
);

// Prediction & outcome logs for 3-level fix-win tracking per user
export const predictionLogs = pgTable(
  'prediction_logs',
  {
    id: serial('id').primaryKey(),
    userUid: text('user_uid')
      .references(() => users.uid)
      .notNull(),
    gameMode: text('game_mode').notNull(),
    period: text('period').notNull(),
    predictedSize: text('predicted_size').notNull(),
    predictedDigit: integer('predicted_digit').notNull(),
    actualNumber: integer('actual_number'),
    actualSize: text('actual_size'),
    outcome: text('outcome').notNull().default('PENDING'),
    level: integer('level').notNull().default(1),
    winningStrategy: text('winning_strategy').notNull(),
    backtestAccuracy: integer('backtest_accuracy').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('prediction_logs_user_mode_period_idx').on(
      table.userUid,
      table.gameMode,
      table.period
    ),
  ]
);

// Stored 500+ round backtest evaluation snapshots
export const backtestReports = pgTable('backtest_reports', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .references(() => users.uid)
    .notNull(),
  gameMode: text('game_mode').notNull(),
  datasetSize: integer('dataset_size').notNull(),
  bestStrategy: text('best_strategy').notNull(),
  level1Accuracy: integer('level1_accuracy').notNull(),
  under3FixRate: integer('under3_fix_rate').notNull(),
  totalSimulatedRounds: integer('total_simulated_rounds').notNull(),
  maxLossStreak: integer('max_loss_streak').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  predictions: many(predictionLogs),
  backtestReports: many(backtestReports),
}));

export const predictionLogsRelations = relations(predictionLogs, ({ one }) => ({
  user: one(users, {
    fields: [predictionLogs.userUid],
    references: [users.uid],
  }),
}));

export const backtestReportsRelations = relations(backtestReports, ({ one }) => ({
  user: one(users, {
    fields: [backtestReports.userUid],
    references: [users.uid],
  }),
}));
