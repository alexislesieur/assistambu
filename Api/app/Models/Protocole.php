<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Protocole extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'titre',
        'categorie',
        'contenu',
        'tags',
        'is_premium',
        'is_active',
        'ordre',
    ];

    protected $casts = [
        'tags'       => 'array',
        'is_premium' => 'boolean',
        'is_active'  => 'boolean',
    ];

    public function scopeActif($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeGratuit($query)
    {
        return $query->where('is_premium', false);
    }
}