<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hopitaux', function (Blueprint $table) {
            $table->id();

            $table->string('name');
            $table->string('ville', 100);
            $table->string('departement', 3);
            $table->string('adresse')->nullable();
            $table->string('telephone', 20)->nullable();
            $table->string('service_urgences', 100)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index('departement');
            $table->index('ville');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hopitaux');
    }
};