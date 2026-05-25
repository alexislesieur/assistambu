<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE gardes MODIFY type VARCHAR(20) NOT NULL DEFAULT 'commercial'");
        DB::statement("UPDATE gardes SET type = 'commercial' WHERE type NOT IN ('commercial', 'garde_dep')");
        DB::statement("ALTER TABLE gardes MODIFY type ENUM('commercial', 'garde_dep') NOT NULL DEFAULT 'commercial'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE gardes MODIFY type ENUM('jour', 'nuit', 'garde_24h', 'astreinte') NOT NULL DEFAULT 'jour'");
    }
};
