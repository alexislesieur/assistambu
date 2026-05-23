<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\InterventionController;
use App\Http\Controllers\Api\SacController;
use App\Http\Controllers\Api\SacItemController;
use App\Http\Controllers\Api\GardeController;
use App\Http\Controllers\Api\Admin\AdminStatsController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\AdminServiceController;
use App\Http\Middleware\IsAdmin;

// ── Zone publique ─────────────────────────────────────────────
Route::post('register',        [AuthController::class, 'register']);
Route::post('login',           [AuthController::class, 'login']);
Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('reset-password',  [AuthController::class, 'resetPassword']);

// ── Zone utilisateur ──────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::get('me',       [AuthController::class, 'me']);
    Route::post('logout',  [AuthController::class, 'logout']);
    Route::put('profile',  [AuthController::class, 'updateProfile']);
    Route::put('password', [AuthController::class, 'updatePassword']);
    Route::delete('account', [AuthController::class, 'deleteAccount']);

    Route::apiResource('interventions', InterventionController::class);

    Route::get('sac',       [SacController::class, 'index']);
    Route::put('sac/check', [SacController::class, 'check']);
    Route::get('sac/stats', [SacController::class, 'stats']);

    Route::post('sac/items',                    [SacItemController::class, 'store']);
    Route::put('sac/items/{sacItem}',           [SacItemController::class, 'update']);
    Route::delete('sac/items/{sacItem}',        [SacItemController::class, 'destroy']);
    Route::post('sac/items/{sacItem}/consume',  [SacItemController::class, 'consume']);
    Route::post('sac/items/{sacItem}/restock',  [SacItemController::class, 'restock']);

    Route::apiResource('gardes', GardeController::class);
    Route::get('gardes/stats/mensuel',          [GardeController::class, 'statsMensuel']);
    Route::post('gardes/{garde}/cloturer',      [GardeController::class, 'cloturer']);
});

// ── Zone admin ────────────────────────────────────────────────
Route::middleware(['auth:sanctum', IsAdmin::class])->prefix('admin')->group(function () {

    Route::get('stats', [AdminStatsController::class, 'index']);

    Route::get('users',               [AdminUserController::class, 'index']);
    Route::get('users/export',        [AdminUserController::class, 'export']);
    Route::get('users/{user}',        [AdminUserController::class, 'show']);
    Route::put('users/{user}/lock',   [AdminUserController::class, 'lock']);
    Route::put('users/{user}/unlock', [AdminUserController::class, 'unlock']);
    Route::put('users/{user}/premium',[AdminUserController::class, 'setPremium']);
    Route::delete('users/{user}',     [AdminUserController::class, 'destroy']);

    Route::get('services',                       [AdminServiceController::class, 'index']);
    Route::put('services/{service}/maintenance', [AdminServiceController::class, 'setMaintenance']);
});