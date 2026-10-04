import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { ListingInput } from "../types";

const categories = ["ELECTRONICS", "FASHION_APPAREL", "HOME_KITCHEN", "HEALTH_WELLNESS", "COLLECTIBLES_ART", "SERVICES"];
const initial: ListingInput = { title: "", description: "", category: "ELECTRONICS", price: "", attributes: {}, seller: "", tags: [] };

export function NewListing() {
  const [form, setForm] = useState(initial);
  const [tags, setTags] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: api.createListing,
    onSuccess: async (listing) => { await queryClient.invalidateQueries({ queryKey: ["listings"] }); navigate(`/listings/${listing.id}`); }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate({ ...form, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) });
  }

  return (
    <section className="narrow">
      <header className="page-header"><div><p className="eyebrow">New submission</p><h1>Create a listing</h1><p>Enter the source content exactly as the seller provided it.</p></div></header>
      <form className="panel form" onSubmit={submit}>
        <label>Title<span>10–150 characters</span><input required minLength={10} maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Wireless noise-cancelling headphones" /></label>
        <label>Description<span>30–3,000 characters</span><textarea required minLength={30} maxLength={3000} rows={7} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the item, its condition, and important specifications." /></label>
        <div className="form-row">
          <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Price<span>USD</span><input required inputMode="decimal" pattern="\d+(\.\d{1,2})?" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="99.00" /></label>
        </div>
        <label>Seller<input required maxLength={120} value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} placeholder="Seller or business name" /></label>
        <label>Tags<span>Comma separated, maximum 10</span><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="wireless, audio, refurbished" /></label>
        {create.isError && <div className="state error">{create.error.message}</div>}
        <div className="form-actions"><button className="button primary" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save listing"}</button></div>
      </form>
    </section>
  );
}
