<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gardes', function (Blueprint $table) {
            $table->foreignId('recurrence_id')
                  ->nullable()
                  ->after('is_running')
                  ->constrained('garde_recurrences')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('gardes', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\GardeRecurrence::class);
            $table->dropColumn('recurrence_id');
        });
    }
};
