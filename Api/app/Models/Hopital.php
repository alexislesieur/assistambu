<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hopital extends Model
{
    use HasFactory;

    protected $table = 'hopitaux';

    protected $fillable = [
        'name',
        'ville',
        'departement',
        'adresse',
        'telephone',
        'service_urgences',
        'latitude',
        'longitude',
        'is_active',
    ];

    protected $casts = [
        'latitude'  => 'float',
        'longitude' => 'float',
        'is_active' => 'boolean',
    ];

    public function scopeActif($query)
    {
        return $query->where('is_active', true);
    }
}