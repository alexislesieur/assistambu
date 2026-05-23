<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interventions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('garde_id')->nullable();

            $table->string('motif');
            $table->enum('categorie', [
                'respi', 'cardio', 'trauma', 'neuro',
                'pediatrie', 'psychiatrie', 'autre',
            ]);

            $table->enum('patient_sexe', ['m', 'f', 'inconnu'])->default('inconnu');
            $table->enum('patient_age_range', [
                'pedia', 'adult', 'senior', 'elderly',
            ])->nullable();

            $table->string('adresse_depart')->nullable();
            $table->string('destination')->nullable();

            $table->timestamp('heure_alerte')->nullable();
            $table->timestamp('heure_depart')->nullable();
            $table->timestamp('heure_arrivee')->nullable();

            $table->json('gestes')->nullable();

            // Constantes vitales en entiers
            $table->unsignedTinyInteger('spo2')->nullable();
            $table->unsignedSmallInteger('fc')->nullable();
            $table->unsignedSmallInteger('pas')->nullable();
            $table->unsignedSmallInteger('pad')->nullable();
            $table->unsignedSmallInteger('temperature')->nullable(); // 376 = 37.6°C
            $table->unsignedSmallInteger('dextro')->nullable();

            $table->json('materiel_consomme')->nullable();
            $table->text('notes')->nullable();

            $table->boolean('is_active')->default(true);
            $table->boolean('is_locked')->default(false);
            $table->timestamp('locked_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'categorie']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interventions');
    }
};