<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SacMouvement extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'sac_item_id',
        'user_id',
        'intervention_id',
        'type',
        'delta',
        'qty_before',
        'qty_after',
        'note',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function item()
    {
        return $this->belongsTo(SacItem::class, 'sac_item_id');
    }

    public function intervention()
    {
        return $this->belongsTo(Intervention::class);
    }
}