<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('protocoles', function (Blueprint $table) {
            $table->id();

            $table->string('slug')->unique();
            $table->string('titre');
            $table->enum('categorie', [
                'bilan',
                'gestes',
                'pathologies',
                'lexique',
                'reglementaire',
            ]);
            $table->text('contenu');
            $table->json('tags')->nullable();
            $table->boolean('is_premium')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('ordre')->default(0);

            $table->timestamps();

            $table->index('categorie');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('protocoles');
    }
};