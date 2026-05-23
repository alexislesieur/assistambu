<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('interventions:lock')->hourly();
Schedule::command('sac:recalculer-statuts')->dailyAt('06:00');
Schedule::command('sanctum:prune-expired', ['--hours=24'])->dailyAt('03:00');