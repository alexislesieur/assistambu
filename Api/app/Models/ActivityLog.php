<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'action',
        'entity_type',
        'entity_id',
        'metadata',
        'ip_address',
    ];

    protected $casts = [
        'metadata'   => 'array',
        'created_at' => 'datetime',
    ];

    public static function record(string $action, $entity = null, array $metadata = []): void
    {
        static::create([
            'user_id'     => auth()->id(),
            'action'      => $action,
            'entity_type' => $entity ? get_class($entity) : null,
            'entity_id'   => $entity?->id,
            'metadata'    => $metadata,
            'ip_address'  => request()->ip(),
        ]);
    }
}