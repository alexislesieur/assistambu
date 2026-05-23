<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gardes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->date('date');
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->unsignedSmallInteger('duree_minutes')->default(0);

            $table->enum('type', ['jour', 'nuit', 'garde_24h', 'astreinte'])->default('jour');

            $table->string('binome')->nullable();

            $table->boolean('is_cloturee')->default(false);
            $table->timestamp('cloturee_at')->nullable();
            $table->text('notes_recap')->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gardes');
    }
};