<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sac_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->string('name');
            $table->enum('categorie', [
                'oxygenotherapie',
                'pansements',
                'immobilisation',
                'medicaments',
                'monitoring',
                'autre',
            ]);

            $table->unsignedSmallInteger('qty_current');
            $table->unsignedSmallInteger('qty_max');
            $table->string('dlc', 10)->nullable();
            $table->enum('status', ['ok', 'warning', 'danger'])->default('ok');
            $table->string('note')->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index(['user_id', 'categorie']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sac_items');
    }
};