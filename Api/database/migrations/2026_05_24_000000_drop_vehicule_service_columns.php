<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['vehicule', 'service']);
        });

        Schema::table('gardes', function (Blueprint $table) {
            $table->dropColumn(['vehicule', 'service']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('vehicule', 20)->nullable();
            $table->string('service', 100)->nullable();
        });

        Schema::table('gardes', function (Blueprint $table) {
            $table->string('vehicule', 20)->nullable();
            $table->string('service', 100)->nullable();
        });
    }
};
