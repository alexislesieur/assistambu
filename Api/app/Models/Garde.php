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
        'is_active',
    ];

    protected $casts = [
        'date'        => 'date',
        'cloturee_at' => 'datetime',
        'is_cloturee' => 'boolean',
        'is_active'   => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (Garde $garde) {
            if ($garde->heure_debut && $garde->heure_fin) {
                $debut = Carbon::createFromTimeString($garde->heure_debut);
                $fin   = Carbon::createFromTimeString($garde->heure_fin);
                if ($fin->lt($debut)) $fin->addDay();
                $garde->duree_minutes = $debut->diffInMinutes($fin);
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
}