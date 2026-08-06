"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Lightbulb, Loader2, MapPin } from "lucide-react";

import { useLocationState } from "@/components/location-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { IDEA_CATEGORY_LABELS, type CitizenIdea, type IdeaCategory } from "@/lib/types";

const CATEGORY_OPTIONS = Object.entries(IDEA_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

/**
 * Ward-level public participation.
 *
 * An idea belongs to a ward, so a ward has to be selected before one can be submitted — this is
 * what makes the ideas useful to the people who plan that ward's budget.
 */
export function CitizenIdeasPanel({ className }: { className?: string }) {
  const { selection, location } = useLocationState();
  const wardCode = selection.wardCode;

  const [ideas, setIdeas] = useState<CitizenIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<IdeaCategory>("roads");
  const [idea, setIdea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const loadIdeas = useCallback(async () => {
    if (!wardCode) {
      setIdeas([]);
      return;
    }
    setLoadingIdeas(true);
    try {
      const response = await fetch(`/api/ideas?wardCode=${encodeURIComponent(wardCode)}`);
      const payload = (await response.json()) as { ideas: CitizenIdea[] };
      setIdeas(payload.ideas ?? []);
    } catch {
      setIdeas([]);
    } finally {
      setLoadingIdeas(false);
    }
  }, [wardCode]);

  useEffect(() => {
    void loadIdeas();
    setSubmitted(false);
  }, [loadIdeas]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection.wardCode || !selection.subCountyCode || !selection.countyCode) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          countyCode: selection.countyCode,
          subCountyCode: selection.subCountyCode,
          wardCode: selection.wardCode,
          category,
          idea: idea.trim()
        })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "The idea could not be submitted.");

      setIdea("");
      setName("");
      setSubmitted(true);
      await loadIdeas();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The idea could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!wardCode) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-primary" aria-hidden />
            Citizen ideas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={MapPin}
            title="Select a ward first"
            description="Ideas are submitted for a specific ward, so they reach the people who plan that ward's budget. Choose a county, sub-county, and ward on the map to continue."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden />
          Citizen ideas for {location.ward?.name} Ward
        </CardTitle>
        <CardDescription>
          Share what you think this ward&apos;s budget should fund. Your name is optional.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form className="space-y-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Name (optional)
              </span>
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Anonymous" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</span>
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value as IdeaCategory)}
                options={CATEGORY_OPTIONS}
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your idea</span>
            <textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              required
              minLength={10}
              maxLength={1000}
              rows={4}
              placeholder="For example: the road between the market and the dispensary floods every rainy season and needs drainage."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={submitting || idea.trim().length < 10}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
              Submit idea
            </Button>
            <p className="text-xs text-muted-foreground">
              Filed under {location.ward?.name}, {location.subCounty?.name}, {location.county?.name} County.
            </p>
          </div>

          {error ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {submitted ? (
            <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Your idea was recorded for this ward.
            </p>
          ) : null}
        </form>

        <div>
          <h3 className="mb-3 text-sm font-bold">
            Ideas submitted for this ward {ideas.length > 0 ? `(${ideas.length})` : ""}
          </h3>
          {loadingIdeas ? (
            <p className="text-sm text-muted-foreground">Loading ideas…</p>
          ) : ideas.length === 0 ? (
            <EmptyState
              title="No ideas yet"
              description="Be the first to say what this ward's budget should fund."
            />
          ) : (
            <ul className="space-y-3">
              {ideas.map((entry) => (
                <li key={entry.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{IDEA_CATEGORY_LABELS[entry.category]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.name ?? "Anonymous"} · {new Date(entry.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6">{entry.idea}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
