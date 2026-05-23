<?php

namespace App\Console\Commands;

use App\Models\Intervention;
use Illuminate\Console\Command;

class LockInterventions extends Command
{
    protected $signature   = 'interventions:lock';
    protected $description = 'Verrouille les interventions de plus de 48h';

    public function handle(): int
    {
        $count = Intervention::where('is_active', true)
            ->where('is_locked', false)
            ->where('created_at', '<=', now()->subHours(48))
            ->update([
                'is_locked' => true,
                'locked_at' => now(),
            ]);

        $this->info("✅ {$count} intervention(s) verrouillée(s).");

        return Command::SUCCESS;
    }
}