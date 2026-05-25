<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Garde extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'date',
        'heure_debut',
        'heure_fin',
        'duree_minutes',
        'type',
        'binome',
        'is_cloturee',
        'cloturee_at',
        'notes_recap',
        'pauses',
        'is_active',
        'is_running',
        'recurrence_id',
    ];

    protected $casts = [
        'date'        => 'date:Y-m-d',
        'cloturee_at' => 'datetime',
        'is_cloturee' => 'boolean',
        'is_active'   => 'boolean',
        'is_running'  => 'boolean',
        'pauses'      => 'array',
    ];

    protected static function booted(): void
    {
        static::saving(function (Garde $garde) {
            if ($garde->heure_debut && $garde->heure_fin) {
                $debut = Carbon::createFromTimeString($garde->heure_debut);
                $fin   = Carbon::createFromTimeString($garde->heure_fin);
                if ($fin->lt($debut)) $fin->addDay();
                $duree = $debut->diffInMinutes($fin);

                foreach ($garde->pauses ?? [] as $pause) {
                    if (!empty($pause['debut']) && !empty($pause['fin'])) {
                        $pDebut = Carbon::createFromTimeString($pause['debut']);
                        $pFin   = Carbon::createFromTimeString($pause['fin']);
                        if ($pFin->lt($pDebut)) $pFin->addDay();
                        $duree -= max(0, $pDebut->diffInMinutes($pFin));
                    }
                }

                $garde->duree_minutes = max(0, $duree);
            }
        });
    }

    public function scopeActif($query)
    {
        return $query->where('is_active', true);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function interventions()
    {
        return $this->hasMany(Intervention::class);
    }

    public function recurrence()
    {
        return $this->belongsTo(GardeRecurrence::class, 'recurrence_id');
    }
}