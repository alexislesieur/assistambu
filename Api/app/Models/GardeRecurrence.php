<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GardeRecurrence extends Model
{
    protected $fillable = [
        'user_id',
        'frequence',
        'jours_semaine',
        'date_debut',
        'date_fin',
        'heure_debut',
        'heure_fin',
        'type',
        'binome',
        'is_active',
    ];

    protected $casts = [
        'jours_semaine' => 'array',
        'date_debut'    => 'date:Y-m-d',
        'date_fin'      => 'date:Y-m-d',
        'is_active'     => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function gardes()
    {
        return $this->hasMany(Garde::class, 'recurrence_id');
    }
}
