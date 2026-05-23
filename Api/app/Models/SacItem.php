<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SacItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'categorie',
        'qty_current',
        'qty_max',
        'dlc',
        'status',
        'note',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function recalculerStatus(): void
    {
        $status = 'ok';

        if ($this->qty_current === 0) {
            $status = 'danger';
        } elseif ($this->dlc && $this->dlc !== 'N/A') {
            $dlcDate = Carbon::createFromFormat('m/Y', $this->dlc)->endOfMonth();
            if ($dlcDate->isPast()) {
                $status = 'danger';
            } elseif ($dlcDate->isBefore(now()->addDays(30))) {
                $status = 'warning';
            }
        }

        if ($status === 'ok' && $this->qty_max > 0 && ($this->qty_current / $this->qty_max) < 0.5) {
            $status = 'warning';
        }

        $this->status = $status;
        $this->save();
    }

    public function scopeActif($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeAlertes($query)
    {
        return $query->whereIn('status', ['warning', 'danger']);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function mouvements()
    {
        return $this->hasMany(SacMouvement::class);
    }
}