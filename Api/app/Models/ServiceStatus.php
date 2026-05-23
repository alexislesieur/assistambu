<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceStatus extends Model
{
    protected $fillable = [
        'service',
        'is_maintenance',
        'message',
    ];

    protected $casts = [
        'is_maintenance' => 'boolean',
    ];
}