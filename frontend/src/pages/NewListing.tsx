import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { ListingInput } from "../types";

const categories = ["ELECTRONICS", "FASHION_APPAREL", "HOME_KITCHEN", "HEALTH_WELLNESS", "COLLECTIBLES_ART", "SERVICES"];
const initial: ListingInput = { title: "", description: "", category: "ELECTRONICS", price: "", attributes: {}, seller: "", tags: [], imageUrl: "" };

function prepareImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(new Error('Choose a JPG, PNG, or WebP image.'));
    if (file.size > 5 * 1024 * 1024) return reject(new Error('The selected image must be smaller than 5 MB.'));
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Image processing is unavailable in this browser.'));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      const result = canvas.toDataURL('image/jpeg', .82);
      if (result.length > 2_000_000) return reject(new Error('The compressed image is still too large. Choose a smaller image.'));
      resolve(result);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('The selected image could not be read.')); };
    image.src = objectUrl;
  });
}

export function NewListing() {
  const [form, setForm] = useState(initial);
  const [tags, setTags] = useState("");
  const [imageError, setImageError] = useState("");
  const [processingImage, setProcessingImage] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: api.createListing,
    onSuccess: async (listing) => { await queryClient.invalidateQueries({ queryKey: ["listings"] }); navigate(`/listings/${listing.id}`); }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate({ ...form, imageUrl: form.imageUrl || undefined, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) });
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageError("");
    setProcessingImage(true);
    try {
      const imageUrl = await prepareImage(file);
      setForm((current) => ({ ...current, imageUrl }));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Could not prepare this image.");
    } finally {
      setProcessingImage(false);
      event.target.value = "";
    }
  }

  return (
    <section className="narrow">
      <header className="page-header"><div><p className="eyebrow">New submission</p><h1>Create a listing</h1><p>Enter the source content exactly as the seller provided it.</p></div></header>
      <form className="panel form" onSubmit={submit}>
        <label>Title<span>10–150 characters</span><input required minLength={10} maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Wireless noise-cancelling headphones" /></label>
        <label>Description<span>30–3,000 characters</span><textarea required minLength={30} maxLength={3000} rows={7} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the item, its condition, and important specifications." /></label>
        <div className="form-row">
          <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Price<span>INR (₹)</span><input required inputMode="decimal" pattern="\d+(\.\d{1,2})?" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="4999.00" /></label>
        </div>
        <label>Seller<input required maxLength={120} value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} placeholder="Seller or business name" /></label>
        <div className="image-field"><div><strong>Product image</strong><span>Upload from your computer or paste an image URL.</span></div><div className="image-options"><label className="upload-button"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} /><span>{processingImage ? "Processing…" : "Upload from computer"}</span></label><span className="or-divider">or</span><input type="url" value={form.imageUrl?.startsWith('data:') ? '' : form.imageUrl ?? ""} onChange={(e) => { setImageError(''); setForm({ ...form, imageUrl: e.target.value }); }} placeholder="https://example.com/product.jpg" /></div></div>
        {imageError && <div className="inline-error">{imageError}</div>}
        {form.imageUrl && <div className="image-preview"><img src={form.imageUrl} alt="Listing preview" /><button type="button" onClick={() => setForm({ ...form, imageUrl: "" })}>Remove image</button></div>}
        <label>Tags<span>Comma separated, maximum 10</span><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="wireless, audio, refurbished" /></label>
        {create.isError && <div className="state error">{create.error.message}</div>}
        <div className="form-actions"><button className="button primary" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save listing"}</button></div>
      </form>
    </section>
  );
}
