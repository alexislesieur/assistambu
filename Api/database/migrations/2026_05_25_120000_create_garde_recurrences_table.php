<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('garde_recurrences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('frequence', ['quotidien', 'hebdomadaire', 'bihebdomadaire', 'mensuel']);
            $table->json('jours_semaine')->nullable();
            $table->date('date_debut');
            $table->date('date_fin')->nullable();
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->enum('type', ['commercial', 'garde_dep'])->default('commercial');
            $table->string('binome', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('garde_recurrences');
    }
};
