<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sac_mouvements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sac_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('intervention_id')->nullable()->constrained()->nullOnDelete();

            $table->enum('type', ['consommation', 'reappro', 'correction']);
            $table->smallInteger('delta');
            $table->unsignedSmallInteger('qty_before');
            $table->unsignedSmallInteger('qty_after');
            $table->string('note')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['sac_item_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sac_mouvements');
    }
};