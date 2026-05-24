<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminArticleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Article::query();

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('categorie')) {
            $query->where('categorie', $request->categorie);
        }

        if ($request->has('active')) {
            $query->where('is_active', (bool) $request->active);
        }

        $articles = $query->orderBy('categorie')->orderBy('name')->paginate(50);

        return response()->json($articles);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'required|string|max:100',
            'categorie' => 'required|in:oxygenotherapie,pansements,immobilisation,medicaments,monitoring,autre',
            'is_active' => 'boolean',
        ]);

        $article = Article::create($data);

        return response()->json($article, 201);
    }

    public function update(Request $request, Article $article): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'sometimes|string|max:100',
            'categorie' => 'sometimes|in:oxygenotherapie,pansements,immobilisation,medicaments,monitoring,autre',
            'is_active' => 'sometimes|boolean',
        ]);

        $article->update($data);

        return response()->json($article->fresh());
    }

    public function destroy(Article $article): JsonResponse
    {
        $article->delete();

        return response()->json(['message' => 'Article supprimé.']);
    }
}
