<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sac_items', function (Blueprint $table) {
            $table->string('emplacement')->nullable()->after('note');
        });
    }

    public function down(): void
    {
        Schema::table('sac_items', function (Blueprint $table) {
            $table->dropColumn('emplacement');
        });
    }
};
