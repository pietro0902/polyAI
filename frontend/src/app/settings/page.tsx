"use client";

import { useState } from "react";
import { useModels } from "@/hooks/useModels";
import { api } from "@/lib/api";
import type { LlmModel } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/card";
import { Button } from "@/components/button";

function EmptyForm() {
  return { name: "", display_name: "", openrouter_id: "" };
}

export default function SettingsPage() {
  const { models, loading, refresh } = useModels();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ display_name: "", openrouter_id: "" });
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (!form.name || !form.display_name || !form.openrouter_id) return;
    setBusy(true);
    try {
      await api.models.create(form);
      setForm(EmptyForm());
      setAdding(false);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add model");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (model: LlmModel) => {
    await api.models.update(model.id, { enabled: !model.enabled });
    await refresh();
  };

  const handleEdit = (model: LlmModel) => {
    setEditingId(model.id);
    setEditForm({ display_name: model.display_name, openrouter_id: model.openrouter_id });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setBusy(true);
    try {
      await api.models.update(editingId, editForm);
      setEditingId(null);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update model");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (model: LlmModel) => {
    if (!confirm(`Delete model "${model.display_name}"? This cannot be undone.`)) return;
    await api.models.delete(model.id);
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage LLM models used for predictions</p>
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)} variant="outline">
            Add Model
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Internal Name</label>
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. mistral"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Mistral Large"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">OpenRouter ID</label>
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. mistralai/mistral-large"
                  value={form.openrouter_id}
                  onChange={(e) => setForm({ ...form, openrouter_id: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAdd} disabled={busy}>
                {busy ? "Adding..." : "Add"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAdding(false);
                  setForm(EmptyForm());
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>LLM Models</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-4">Loading models...</p>
          ) : models.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No models configured. Click "Add Model" to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Name</th>
                    <th className="pb-3 font-medium text-muted-foreground">Display Name</th>
                    <th className="pb-3 font-medium text-muted-foreground">OpenRouter ID</th>
                    <th className="pb-3 font-medium text-muted-foreground">Enabled</th>
                    <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model.id} className="border-b">
                      <td className="py-3 font-medium">{model.name}</td>
                      <td className="py-3">
                        {editingId === model.id ? (
                          <input
                            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                            value={editForm.display_name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, display_name: e.target.value })
                            }
                          />
                        ) : (
                          model.display_name
                        )}
                      </td>
                      <td className="py-3">
                        {editingId === model.id ? (
                          <input
                            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                            value={editForm.openrouter_id}
                            onChange={(e) =>
                              setEditForm({ ...editForm, openrouter_id: e.target.value })
                            }
                          />
                        ) : (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {model.openrouter_id}
                          </code>
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggle(model)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            model.enabled ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              model.enabled ? "translate-x-4" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          {editingId === model.id ? (
                            <>
                              <Button size="sm" onClick={handleSaveEdit} disabled={busy}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(model)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(model)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
