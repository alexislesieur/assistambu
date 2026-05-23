<?php

namespace App\Console\Commands;

use App\Models\SacItem;
use Illuminate\Console\Command;

class RecalculerStatutsDlc extends Command
{
    protected $signature   = 'sac:recalculer-statuts';
    protected $description = 'Recalcule quotidiennement les statuts DLC de tous les items du sac';

    public function handle(): int
    {
        $items = SacItem::where('is_active', true)->get();

        $updated = 0;

        foreach ($items as $item) {
            $ancienStatut = $item->status;
            $item->recalculerStatus();
            if ($item->wasChanged('status')) {
                $updated++;
                $this->line("  ↳ {$item->name} : {$ancienStatut} → {$item->status}");
            }
        }

        $this->info("✅ {$items->count()} items analysés, {$updated} statut(s) mis à jour.");

        return Command::SUCCESS;
    }
}