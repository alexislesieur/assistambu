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
        'categorie',
        'qty_current',
        'qty_max',
        'dlc',
        'dlcs',
        'status',
        'note',
        'emplacement',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'dlcs'      => 'array',
    ];

    public function recalculerStatus(): void
    {
        $this->dlc = $this->earliestDlc();

        $status = 'ok';

        if ($this->qty_current === 0) {
            $status = 'danger';
        } elseif ($this->dlc && $this->dlc !== 'N/A') {
            $dlcDate = Carbon::createFromFormat('d/m/Y', $this->dlc);
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

    public function earliestDlc(): ?string
    {
        $lots = $this->dlcs ?? [];
        if (empty($lots)) {
            return $this->dlc;
        }

        $dates = collect($lots)
            ->filter(fn($l) => !empty($l['dlc']))
            ->map(fn($l) => Carbon::createFromFormat('d/m/Y', $l['dlc']))
            ->sort();

        return $dates->isNotEmpty() ? $dates->first()->format('d/m/Y') : $this->dlc;
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