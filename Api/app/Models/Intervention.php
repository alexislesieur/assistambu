<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Intervention extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'garde_id',
        'type_mission',
        'motif',
        'categorie',
        'patient_sexe',
        'patient_age_range',
        'adresse_depart',
        'destination',
        'heure_alerte',
        'heure_depart',
        'heure_arrivee',
        'gestes',
        'spo2',
        'fc',
        'pas',
        'pad',
        'temperature',
        'dextro',
        'materiel_consomme',
        'notes',
        'is_active',
        'is_locked',
        'locked_at',
    ];

    protected $casts = [
        'gestes'            => 'array',
        'materiel_consomme' => 'array',
        'heure_alerte'      => 'datetime',
        'heure_depart'      => 'datetime',
        'heure_arrivee'     => 'datetime',
        'locked_at'         => 'datetime',
        'is_active'         => 'boolean',
        'is_locked'         => 'boolean',
    ];

    public function scopeActif($query)
    {
        return $query->where('is_active', true);
    }

    public function getDureeTransportAttribute(): ?int
    {
        if (!$this->heure_depart || !$this->heure_arrivee) return null;
        return (int) $this->heure_depart->diffInMinutes($this->heure_arrivee);
    }

    public function getTemperatureAffichageAttribute(): ?string
    {
        if (!$this->temperature) return null;
        return number_format($this->temperature / 10, 1) . '°C';
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function garde()
    {
        return $this->belongsTo(Garde::class);
    }
}