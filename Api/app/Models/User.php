<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, Billable, SoftDeletes;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'is_premium',
        'premium_expires_at',
        'is_admin',
        'is_locked',
        'lock_reason',
        'last_login_at',
        'stripe_id',
        'pm_type',
        'pm_last_four',
        'trial_ends_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'stripe_id',
    ];

    protected $casts = [
        'email_verified_at'  => 'datetime',
        'premium_expires_at' => 'datetime',
        'last_login_at'      => 'datetime',
        'trial_ends_at'      => 'datetime',
        'is_premium'         => 'boolean',
        'is_admin'           => 'boolean',
        'is_locked'          => 'boolean',
        'password'           => 'hashed',
    ];

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function isPremium(): bool
    {
        if ($this->subscribed('default')) return true;

        return $this->is_premium && (
            $this->premium_expires_at === null ||
            $this->premium_expires_at->isFuture()
        );
    }

    public function interventions()
    {
        return $this->hasMany(Intervention::class);
    }

    public function sacItems()
    {
        return $this->hasMany(SacItem::class);
    }

    public function gardes()
    {
        return $this->hasMany(Garde::class);
    }
}