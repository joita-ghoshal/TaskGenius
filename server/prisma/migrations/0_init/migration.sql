-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "goals" TEXT NOT NULL DEFAULT '',
    "dailyTarget" INTEGER NOT NULL DEFAULT 5,
    "workingHourStart" VARCHAR(5) NOT NULL DEFAULT '09:00',
    "workingHourEnd" VARCHAR(5) NOT NULL DEFAULT '17:00',
    "preferredStudyTime" VARCHAR(20) NOT NULL DEFAULT 'morning',
    "role" VARCHAR(10) NOT NULL DEFAULT 'user',
    "voiceMuted" BOOLEAN NOT NULL DEFAULT false,
    "voiceLanguage" VARCHAR(10) NOT NULL DEFAULT 'en',
    "voiceVolume" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "resetPasswordToken" TEXT,
    "resetPasswordExpire" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" VARCHAR(10) NOT NULL DEFAULT 'medium',
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "deadline" TIMESTAMP(3),
    "estimatedDuration" INTEGER NOT NULL DEFAULT 60,
    "completedAt" TIMESTAMP(3),
    "completionProbability" INTEGER NOT NULL DEFAULT 100,
    "riskLevel" VARCHAR(10) NOT NULL DEFAULT 'low',
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "emergencyResolvedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_subtasks" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_notes" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "message" TEXT NOT NULL,
    "task_id" UUID,
    "urgency" VARCHAR(10) NOT NULL DEFAULT 'low',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sessionId" VARCHAR(100) NOT NULL,
    "role" VARCHAR(10) NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'chat',
    "metadata" JSONB,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksMissed" INTEGER NOT NULL DEFAULT 0,
    "tasksCreated" INTEGER NOT NULL DEFAULT 0,
    "focusSessions" INTEGER NOT NULL DEFAULT 0,
    "focusMinutes" INTEGER NOT NULL DEFAULT 0,
    "productivityScore" INTEGER NOT NULL DEFAULT 0,
    "averageCompletionTime" INTEGER NOT NULL DEFAULT 0,
    "aiInteractions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "tasks_user_id_status_idx" ON "tasks"("user_id", "status");

-- CreateIndex
CREATE INDEX "tasks_user_id_deadline_idx" ON "tasks"("user_id", "deadline");

-- CreateIndex
CREATE INDEX "tasks_user_id_priority_idx" ON "tasks"("user_id", "priority");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_createdAt_idx" ON "notifications"("user_id", "read", "createdAt");

-- CreateIndex
CREATE INDEX "ai_history_user_id_sessionId_createdAt_idx" ON "ai_history"("user_id", "sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_history_user_id_type_createdAt_idx" ON "ai_history"("user_id", "type", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_user_id_date_idx" ON "analytics"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_user_id_date_key" ON "analytics"("user_id", "date");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_subtasks" ADD CONSTRAINT "task_subtasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_notes" ADD CONSTRAINT "task_notes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_history" ADD CONSTRAINT "ai_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

