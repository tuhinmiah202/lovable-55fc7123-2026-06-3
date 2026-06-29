import { useState, useEffect } from "react";
import { Shield, BookOpen, Users, Check, X, Trash2, Star, Loader2, Plus, PenTool, FileText, Search, ShoppingCart, Settings, Eye, Upload, Wallet, Download, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadBookPartFile } from "@/lib/partFiles";
import { useCategories } from "@/hooks/useBooks";
import { useQueryClient } from "@tanstack/react-query";

const Admin = () => {
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [pendingUploads, setPendingUploads] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [writers, setWriters] = useState<any[]>([]);
  const [writerRequests, setWriterRequests] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const { data: categories = [] } = useCategories();
  const [loading, setLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const queryClient = useQueryClient();

  // Add book form
  const [showAddBook, setShowAddBook] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addAuthor, setAddAuthor] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addCategoryId, setAddCategoryId] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addFeatured, setAddFeatured] = useState(false);
  const [addIsNew, setAddIsNew] = useState(false);
  const [addParts, setAddParts] = useState<{ title: string; content: string }[]>([
    { title: "", content: "" },
    { title: "", content: "" },
    { title: "", content: "" },
  ]);
  const [writerSearch, setWriterSearch] = useState("");
  const [writerSearchResults, setWriterSearchResults] = useState<any[]>([]);
  const [selectedWriter, setSelectedWriter] = useState<any>(null);
  const [addCoverFile, setAddCoverFile] = useState<File | null>(null);
  const [addCoverPreview, setAddCoverPreview] = useState<string | null>(null);

  // Book search & detail
  const [bookSearch, setBookSearch] = useState("");
  const [viewingBookAdmin, setViewingBookAdmin] = useState<any>(null);
  const [adminBookParts, setAdminBookParts] = useState<any[]>([]);
  const [adminNewPartTitle, setAdminNewPartTitle] = useState("");
  const [adminNewPartContent, setAdminNewPartContent] = useState("");
  const [adminAddingPart, setAdminAddingPart] = useState(false);
  // Book edit form
  const [editingBook, setEditingBook] = useState(false);
  const [editForm, setEditForm] = useState<{ title: string; author: string; price: string; category_id: string; description: string; pages: string }>({ title: "", author: "", price: "", category_id: "", description: "", pages: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Writer section
  const [writerBookSearch, setWriterBookSearch] = useState("");
  const [viewingWriterBooks, setViewingWriterBooks] = useState<any>(null);
  const [writerBooksData, setWriterBooksData] = useState<any[]>([]);
  const [makeWriterSearch, setMakeWriterSearch] = useState("");
  const [makeWriterResults, setMakeWriterResults] = useState<any[]>([]);

  // bKash settings
  const [bkashSettings, setBkashSettings] = useState<any[]>([]);
  const [newBkashNumber, setNewBkashNumber] = useState("");
  const [newBkashQrFile, setNewBkashQrFile] = useState<File | null>(null);
  // Extra password lock for bKash settings (hash of "bikash@777", never stored in DB)
  const BKASH_LOCK_HASH = "00df388c8938352d341247ac6e26d21cfb9a201c7f3ccc014466d8ee108229b9";
  const [bkashUnlocked, setBkashUnlocked] = useState(false);
  const [bkashPwInput, setBkashPwInput] = useState("");
  const [bkashPwError, setBkashPwError] = useState("");
  const tryUnlockBkash = async () => {
    const enc = new TextEncoder().encode(bkashPwInput);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (hex === BKASH_LOCK_HASH) {
      setBkashUnlocked(true);
      setBkashPwInput("");
      setBkashPwError("");
    } else {
      setBkashPwError("ভুল পাসওয়ার্ড।");
    }
  };
  // Withdrawals
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // App installs
  const [installCount, setInstallCount] = useState<number>(0);
  const [appInstalls, setAppInstalls] = useState<any[]>([]);
  const [writerListSearch, setWriterListSearch] = useState("");
  const [userListSearch, setUserListSearch] = useState("");
  const [resettingInstalls, setResettingInstalls] = useState(false);

  const resetAppInstalls = async () => {
    if (!confirm("সব অ্যাপ ইনস্টল রেকর্ড ডাটাবেজ থেকে মুছে ফেলবেন? এই কাজ আর ফেরানো যাবে না।")) return;
    setResettingInstalls(true);
    try {
      const { error } = await supabase.from("app_installs").delete().not("id", "is", null);
      if (error) throw error;
      await fetchInstallCount();
      await fetchAppInstalls();
    } catch (e: any) { alert("ত্রুটি: " + e.message); }
    setResettingInstalls(false);
  };

  // Text-to-file tool
  const [t2fText, setT2fText] = useState("");
  const [t2fName, setT2fName] = useState("");

  useEffect(() => {
    fetchPending(); fetchBooks(); fetchUsers(); fetchWriters();
    fetchWriterRequests(); fetchOrders(); fetchBkashSettings();
    fetchWithdrawals(); fetchInstallCount(); fetchAppInstalls();
  }, []);

  const fetchPending = async () => {
    const { data: uploads } = await supabase.from("book_uploads").select("*, categories(name)").eq("status", "pending").order("created_at", { ascending: false });
    if (!uploads) { setPendingUploads([]); return; }
    const userIds = [...new Set(uploads.map((u: any) => u.user_id).filter(Boolean))];
    let uploaderById: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, name, email").in("id", userIds);
      uploaderById = (profiles || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
    }
    setPendingUploads(uploads.map((u: any) => ({ ...u, uploader: uploaderById[u.user_id] || null })));
  };

  const fetchBooks = async () => {
    const { data } = await supabase.from("books").select("*, categories(name)").order("created_at", { ascending: false }).limit(100);
    setBooks(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    setUsers(data || []);
  };

  const fetchWriters = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("is_writer", true).order("created_at", { ascending: false });
    setWriters(data || []);
  };

  const fetchWriterRequests = async () => {
    const { data } = await supabase.from("writer_applications").select("*").eq("status", "pending").order("created_at", { ascending: false });
    setWriterRequests(data || []);
  };

  const fetchOrders = async () => {
    // Auto-purge rejected orders older than 24h (best-effort).
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("book_orders").delete().eq("status", "rejected").lt("created_at", cutoff);
    } catch (_) { /* ignore */ }

    const { data } = await supabase.from("book_orders").select("*").order("created_at", { ascending: false }).limit(200);
    if (data && data.length > 0) {
      const bookIds = [...new Set(data.map((o: any) => o.book_id))];
      const userIds = [...new Set(data.map((o: any) => o.user_id))];
      const [{ data: booksData }, { data: profilesData }] = await Promise.all([
        supabase.from("books").select("id, title, author, price").in("id", bookIds),
        supabase.from("profiles").select("id, name, email").in("id", userIds),
      ]);
      const booksById = (booksData || []).reduce((acc: any, b: any) => { acc[b.id] = b; return acc; }, {});
      const usersById = (profilesData || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
      setOrders(data.map((o: any) => ({ ...o, book: booksById[o.book_id], buyer: usersById[o.user_id] })));
    } else { setOrders([]); }
  };

  const fetchBkashSettings = async () => {
    const { data } = await supabase.from("payment_settings").select("*").order("created_at", { ascending: true });
    setBkashSettings(data || []);
  };

  const fetchWithdrawals = async () => {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data) { setWithdrawals([]); return; }
    const uids = [...new Set(data.map((w: any) => w.user_id))];
    let usersById: Record<string, any> = {};
    if (uids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name, email").in("id", uids);
      usersById = (profs || []).reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {});
    }
    setWithdrawals(data.map((w: any) => ({ ...w, user: usersById[w.user_id] || null })));
  };

  const fetchInstallCount = async () => {
    const { count } = await supabase
      .from("app_installs")
      .select("*", { count: "exact", head: true });
    setInstallCount(count || 0);
  };

  const fetchAppInstalls = async () => {
    const { data } = await supabase
      .from("app_installs")
      .select("*")
      .order("installed_at", { ascending: false })
      .limit(200);
    setAppInstalls(data || []);
  };

  const setWithdrawalStatus = async (id: string, status: "paid" | "rejected") => {
    setLoading(true);
    await supabase
      .from("withdrawal_requests")
      .update({ status, processed_at: new Date().toISOString() })
      .eq("id", id);
    fetchWithdrawals();
    setLoading(false);
  };

  const downloadTextAsFile = () => {
    if (!t2fText.trim()) { alert("টেক্সট লিখুন!"); return; }
    const safe = (t2fName || "book-part").replace(/[^a-zA-Z0-9_\-\u0980-\u09FF]/g, "_");
    const blob = new Blob([t2fText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const confirmOrder = async (orderId: string) => {
    setLoading(true);
    await supabase.from("book_orders").update({ status: "confirmed" }).eq("id", orderId);
    fetchOrders(); setLoading(false);
  };

  const rejectOrder = async (orderId: string) => {
    setLoading(true);
    await supabase.from("book_orders").update({ status: "rejected" }).eq("id", orderId);
    fetchOrders(); setLoading(false);
  };

  const searchWriters = async (query: string) => {
    if (!query.trim()) { setWriterSearchResults([]); return; }
    const { data } = await supabase.from("profiles").select("*").eq("is_writer", true)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,mobile_number.ilike.%${query}%`).limit(10);
    setWriterSearchResults(data || []);
  };

  const approveWriterRequest = async (application: any) => {
    setLoading(true);
    try {
      await supabase.from("writer_applications").update({ status: "approved" }).eq("id", application.id);
      await supabase.from("profiles").update({
        is_writer: true, mobile_number: application.mobile_number, hometown: application.hometown,
        village: application.village, facebook_page: application.facebook_page, facebook_id: application.facebook_id,
        bkash_number: application.mobile_number,
      }).eq("id", application.user_id);
      fetchWriterRequests(); fetchWriters();
    } catch (err: any) { alert("ত্রুটি: " + err.message); }
    setLoading(false);
  };

  const rejectWriterRequest = async (id: string) => {
    await supabase.from("writer_applications").update({ status: "rejected" }).eq("id", id);
    fetchWriterRequests();
  };

  const approveBook = async (upload: any) => {
    setLoading(true);
    try {
      let partsData: any[] = [];
      try { partsData = JSON.parse(upload.content || "[]"); } catch {
        if (upload.content) partsData = [{ part_number: 1, title: "পর্ব ১", content: upload.content }];
      }
      if (upload.is_new_part && upload.book_id) {
        for (const part of partsData) {
          await supabase.from("book_parts").insert({
            book_id: upload.book_id, part_number: part.part_number || upload.part_number,
            title: part.title || `পর্ব ${part.part_number || upload.part_number}`, content: part.content, status: "approved",
          });
        }
      } else {
        const { data: newBook, error: insertErr } = await supabase.from("books").insert({
          title: upload.title, author: upload.author_name, description: upload.description, content: "",
          cover_url: upload.cover_url, category_id: upload.category_id, price: upload.price,
          uploader_id: upload.uploader_profile_id || upload.user_id, is_new: true,
        }).select("id").single();
        if (insertErr) throw insertErr;
        for (const part of partsData) {
          await supabase.from("book_parts").insert({
            book_id: newBook.id, part_number: part.part_number, title: part.title || `পর্ব ${part.part_number}`,
            content: part.content, status: "approved",
          });
        }
      }
      await supabase.from("book_uploads").update({ status: "approved" }).eq("id", upload.id);
      await supabase.from("profiles").update({ is_writer: true }).eq("id", upload.user_id);
      fetchPending(); fetchBooks(); fetchWriters();
      queryClient.invalidateQueries({ queryKey: ["books"] });
    } catch (err: any) { alert("ত্রুটি: " + err.message); }
    setLoading(false);
  };

  const rejectBook = async (id: string, fileUrl: string | null) => {
    await supabase.from("book_uploads").update({ status: "rejected" }).eq("id", id);
    fetchPending();
  };

  const deleteBook = async (id: string) => {
    if (!confirm("এই বইটি মুছে ফেলতে চান?")) return;
    await supabase.from("books").delete().eq("id", id);
    fetchBooks(); queryClient.invalidateQueries({ queryKey: ["books"] });
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from("books").update({ featured: !current }).eq("id", id);
    fetchBooks(); queryClient.invalidateQueries({ queryKey: ["books"] });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await supabase.from("categories").insert({ name: newCategoryName.trim() });
    setNewCategoryName(""); queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("এই ক্যাটাগরি মুছে ফেলতে চান?")) return;
    await supabase.from("categories").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (!authUser) throw new Error("সেশন শেষ হয়েছে — আবার লগইন করুন");

      const filledParts = addParts.filter(p => p.content.trim());
      if (filledParts.length < 3) { alert("সর্বনিম্ন ৩টি পর্ব লিখতে হবে!"); setLoading(false); return; }
      let coverUrl: string | null = null;
      if (addCoverFile) {
        const ext = addCoverFile.name.split(".").pop();
        const path = `${authUser.id}/admin-covers/${Date.now()}.${ext}`;
        const { error: coverErr } = await supabase.storage.from("cover-photos").upload(path, addCoverFile);
        if (coverErr) throw new Error("কভার ছবি আপলোড ব্যর্থ: " + coverErr.message);
        const { data: urlData } = supabase.storage.from("cover-photos").getPublicUrl(path);
        coverUrl = urlData.publicUrl;
      }
      const { data: newBook, error } = await supabase.from("books").insert({
        title: addTitle.trim(), author: addAuthor.trim(), description: addDesc.trim(), content: "",
        category_id: addCategoryId || null, price: parseInt(addPrice) || 0, featured: addFeatured,
        is_new: addIsNew, cover_url: coverUrl, uploader_id: selectedWriter?.id || null,
      }).select("id").single();
      if (error) throw error;
      const partsToInsert = addParts.filter(p => p.content.trim()).map((p, i) => ({
        book_id: newBook.id, part_number: i + 1,
        title: p.title.trim() || `পর্ব ${i + 1}`, content: p.content.trim(), status: "approved",
      }));
      for (const part of partsToInsert) { await supabase.from("book_parts").insert(part); }
      setShowAddBook(false);
      setAddTitle(""); setAddAuthor(""); setAddDesc(""); setAddCategoryId(""); setAddPrice("");
      setAddFeatured(false); setAddIsNew(false);
      setAddParts([{ title: "", content: "" }, { title: "", content: "" }, { title: "", content: "" }]);
      setSelectedWriter(null); setWriterSearch(""); setWriterSearchResults([]);
      setAddCoverFile(null); setAddCoverPreview(null);
      fetchBooks(); queryClient.invalidateQueries({ queryKey: ["books"] });
    } catch (err: any) { alert("ত্রুটি: " + err.message); }
    setLoading(false);
  };

  const openAdminBookDetail = async (book: any) => {
    setViewingBookAdmin(book);
    setEditingBook(false);
    setEditForm({
      title: book.title || "",
      author: book.author || "",
      price: String(book.price ?? 0),
      category_id: book.category_id || "",
      description: book.description || "",
      pages: String(book.pages ?? 0),
    });
    const { data } = await supabase.from("book_parts").select("*").eq("book_id", book.id).order("part_number", { ascending: true });
    setAdminBookParts(data || []);
  };

  const handleSaveBookEdit = async () => {
    if (!viewingBookAdmin) return;
    const title = editForm.title.trim();
    if (!title) { alert("বইয়ের নাম দিন"); return; }
    setSavingEdit(true);
    try {
      const payload: any = {
        title,
        author: editForm.author.trim(),
        price: Number(editForm.price) || 0,
        category_id: editForm.category_id || null,
        description: editForm.description.trim(),
        pages: Number(editForm.pages) || 0,
      };
      const { error } = await supabase.from("books").update(payload).eq("id", viewingBookAdmin.id);
      if (error) throw error;
      const catName = categories.find((c) => c.id === payload.category_id)?.name || "";
      const updated = { ...viewingBookAdmin, ...payload, categories: { name: catName } };
      setViewingBookAdmin(updated);
      setBooks((prev) => prev.map((b) => b.id === viewingBookAdmin.id ? { ...b, ...payload, categories: { name: catName } } : b));
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["book", viewingBookAdmin.id] });
      setEditingBook(false);
      alert("✅ সংরক্ষণ সম্পন্ন");
    } catch (err: any) {
      alert("ত্রুটি: " + (err?.message || err));
    } finally {
      setSavingEdit(false);
    }
  };


  const handleAdminAddPart = async () => {
    if (!viewingBookAdmin || !adminNewPartContent.trim()) return;
    setAdminAddingPart(true);
    try {
      const nextNum = adminBookParts.length + 1;
      await supabase.from("book_parts").insert({
        book_id: viewingBookAdmin.id, part_number: nextNum,
        title: adminNewPartTitle.trim() || `পর্ব ${nextNum}`, content: adminNewPartContent.trim(), status: "approved",
      });
      setAdminNewPartTitle(""); setAdminNewPartContent("");
      const { data } = await supabase.from("book_parts").select("*").eq("book_id", viewingBookAdmin.id).order("part_number", { ascending: true });
      setAdminBookParts(data || []);
    } catch (err: any) { alert("ত্রুটি: " + err.message); }
    setAdminAddingPart(false);
  };

  const fetchWriterBooks = async (writerId: string) => {
    const { data } = await supabase.from("books").select("*, categories(name)").eq("uploader_id", writerId).order("created_at", { ascending: false });
    setWriterBooksData(data || []);
  };

  const searchUsersForMakeWriter = async (query: string) => {
    if (!query.trim()) { setMakeWriterResults([]); return; }
    const { data } = await supabase.from("profiles").select("*").eq("is_writer", false)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,mobile_number.ilike.%${query}%`).limit(10);
    setMakeWriterResults(data || []);
  };

  // Make writer form state
  const [makeWriterFormUser, setMakeWriterFormUser] = useState<any>(null);
  const [mwName, setMwName] = useState("");
  const [mwMobile, setMwMobile] = useState("");
  const [mwHometown, setMwHometown] = useState("");
  const [mwVillage, setMwVillage] = useState("");
  const [mwFbId, setMwFbId] = useState("");
  const [mwFbPage, setMwFbPage] = useState("");
  const [mwBkash, setMwBkash] = useState("");

  const openMakeWriterForm = (user: any) => {
    setMakeWriterFormUser(user);
    setMwName(user.name || "");
    setMwMobile(user.mobile_number || "");
    setMwHometown(user.hometown || "");
    setMwVillage(user.village || "");
    setMwFbId(user.facebook_id || "");
    setMwFbPage(user.facebook_page || "");
    setMwBkash(user.bkash_number || "");
    setMakeWriterResults([]);
    setMakeWriterSearch("");
  };

  const makeUserWriter = async () => {
    if (!makeWriterFormUser) return;
    if (!mwName.trim()) { alert("লেখকের নাম দিন।"); return; }
    setLoading(true);
    await supabase.from("profiles").update({
      is_writer: true,
      name: mwName.trim(),
      mobile_number: mwMobile.trim() || null,
      hometown: mwHometown.trim() || null,
      village: mwVillage.trim() || null,
      facebook_id: mwFbId.trim() || null,
      facebook_page: mwFbPage.trim() || null,
      bkash_number: mwBkash.trim() || null,
    }).eq("id", makeWriterFormUser.id);
    setMakeWriterFormUser(null);
    setMakeWriterSearch(""); setMakeWriterResults([]);
    fetchWriters(); fetchUsers();
    setLoading(false);
  };

  const handleAddBkash = async () => {
    if (!newBkashNumber.trim()) return;
    setLoading(true);
    try {
      let qrUrl: string | null = null;
      if (newBkashQrFile) {
        const ext = newBkashQrFile.name.split(".").pop();
        const path = `bkash-qr/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("cover-photos").upload(path, newBkashQrFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("cover-photos").getPublicUrl(path);
        qrUrl = urlData.publicUrl;
      }
      await supabase.from("payment_settings").insert({ bkash_number: newBkashNumber.trim(), bkash_qr_url: qrUrl });
      setNewBkashNumber(""); setNewBkashQrFile(null);
      fetchBkashSettings();
    } catch (err: any) { alert("ত্রুটি: " + err.message); }
    setLoading(false);
  };

  const deleteBkash = async (id: string) => {
    if (!confirm("এই বিকাশ নম্বর মুছে ফেলতে চান?")) return;
    await supabase.from("payment_settings").delete().eq("id", id);
    fetchBkashSettings();
  };

  const toggleUserBlock = async (u: any) => {
    const next = !u.is_blocked;
    if (!confirm(next ? `${u.name || u.email} কে ব্লক করবেন?` : `${u.name || u.email} কে আনব্লক করবেন?`)) return;
    await (supabase.from("profiles") as any).update({ is_blocked: next }).eq("id", u.id);
    fetchUsers();
  };

  const toggleWriterBlock = async (w: any) => {
    const next = !w.writer_blocked;
    if (!confirm(next ? `${w.name || w.email} এর লেখক প্রোফাইল ব্লক করবেন? তাঁর সব বইও ব্লক হবে।` : `${w.name || w.email} এর লেখক প্রোফাইল আনব্লক করবেন?`)) return;
    await (supabase.from("profiles") as any).update({ writer_blocked: next }).eq("id", w.id);
    // Cascade to books
    await (supabase.from("books") as any).update({ blocked: next }).eq("uploader_id", w.id);
    fetchWriters();
    fetchBooks();
    queryClient.invalidateQueries({ queryKey: ["books"] });
  };

  const pendingOrders = orders.filter((o: any) => o.status === "pending");
  const filteredBooks = bookSearch ? books.filter((b: any) => b.title?.toLowerCase().includes(bookSearch.toLowerCase()) || b.author?.toLowerCase().includes(bookSearch.toLowerCase())) : books;

  const pendingWithdrawals = withdrawals.filter((w: any) => w.status === "pending");
  const tabs = [
    { id: "pending", label: "অনুমোদন", icon: Shield, badge: pendingUploads.length },
    { id: "orders", label: "বই অর্ডার", icon: ShoppingCart, badge: pendingOrders.length },
    { id: "writer-requests", label: "লেখক আবেদন", icon: FileText, badge: writerRequests.length },
    { id: "withdrawals", label: "উইথড্র অনুরোধ", icon: Wallet, badge: pendingWithdrawals.length },
    { id: "books", label: "বই", icon: BookOpen },
    { id: "categories", label: "ক্যাটাগরি", icon: BookOpen },
    { id: "writers", label: "লেখক", icon: PenTool },
    { id: "users", label: "ব্যবহারকারী", icon: Users },
    { id: "installs", label: "অ্যাপ ইনস্টল", icon: Smartphone, badge: installCount },
    { id: "featured", label: "নির্বাচিত", icon: Star },
    { id: "bkash", label: "বিকাশ সেটিংস", icon: Settings },
    { id: "tools", label: "টুলস", icon: FileText },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary"><Shield className="h-6 w-6 text-primary-foreground" /></div>
        <div className="flex-1"><h1 className="text-2xl font-bold">অ্যাডমিন প্যানেল</h1><p className="text-sm text-muted-foreground">বই ঘর ব্যবস্থাপনা</p></div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <div>
            <p className="text-[10px] text-muted-foreground leading-none">মোট ইনস্টল</p>
            <p className="text-lg font-extrabold text-primary leading-tight">{installCount}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            <tab.icon className="h-4 w-4" />{tab.label}
            {tab.badge ? <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">{tab.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Pending */}
      {activeTab === "pending" && (
        <div>
          <h2 className="text-xl font-bold mb-4">অনুমোদনের অপেক্ষায় ({pendingUploads.length})</h2>
          {pendingUploads.length === 0 ? <p className="text-muted-foreground py-10 text-center">কোনো বই অনুমোদনের অপেক্ষায় নেই।</p> : (
            <div className="flex flex-col gap-3">
              {pendingUploads.map((upload) => {
                let partCount = 0;
                try { partCount = JSON.parse(upload.content || "[]").length; } catch { partCount = upload.content ? 1 : 0; }
                return (
                  <div key={upload.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-start gap-4">
                      {upload.cover_url && <img src={upload.cover_url} alt="" className="h-20 w-14 rounded-lg object-cover flex-shrink-0" />}
                      <div className="flex-1">
                        <h3 className="font-bold">{upload.title}</h3>
                        <p className="text-sm text-muted-foreground">{upload.author_name} • {upload.categories?.name || "অশ্রেণিবদ্ধ"}</p>
                        <p className="text-xs text-muted-foreground mt-1">আপলোডকারী: {upload.uploader?.name || upload.uploader?.email || "অজানা"}</p>
                        {upload.is_new_part && <p className="text-xs text-primary font-semibold mt-1">📝 নতুন পর্ব (পর্ব {upload.part_number})</p>}
                        {!upload.is_new_part && <p className="text-xs text-primary mt-1">📖 {partCount}টি পর্ব</p>}
                        {upload.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{upload.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">মূল্য: {upload.price === 0 ? "ফ্রি" : `৳${upload.price}`}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => approveBook(upload)} disabled={loading}
                          className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} অনুমোদন
                        </button>
                        <button onClick={() => rejectBook(upload.id, upload.file_url)}
                          className="flex items-center gap-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90">
                          <X className="h-4 w-4" /> বাতিল
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Writer Requests */}
      {activeTab === "writer-requests" && (
        <div>
          <h2 className="text-xl font-bold mb-4">লেখক আবেদন ({writerRequests.length})</h2>
          {writerRequests.length === 0 ? <p className="text-muted-foreground py-10 text-center">কোনো লেখক আবেদন নেই।</p> : (
            <div className="flex flex-col gap-3">
              {writerRequests.map((app) => (
                <div key={app.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0"><PenTool className="h-5 w-5 text-primary" /></div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{app.name || "—"}</h3>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                        <p><span className="font-medium">মোবাইল:</span> {app.mobile_number}</p>
                        {app.hometown && <p><span className="font-medium">জেলা:</span> {app.hometown}</p>}
                        {app.village && <p><span className="font-medium">গ্রাম:</span> {app.village}</p>}
                        {app.facebook_id && <p><span className="font-medium">ফেসবুক:</span> <a href={app.facebook_id} target="_blank" rel="noopener noreferrer" className="text-primary underline">প্রোফাইল</a></p>}
                        {app.facebook_page && <p><span className="font-medium">পেজ:</span> <a href={app.facebook_page} target="_blank" rel="noopener noreferrer" className="text-primary underline">পেজ</a></p>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => approveWriterRequest(app)} disabled={loading}
                        className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} অনুমোদন
                      </button>
                      <button onClick={() => rejectWriterRequest(app.id)}
                        className="flex items-center gap-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90">
                        <X className="h-4 w-4" /> বাতিল
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Books */}
      {activeTab === "books" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">সকল বই ({books.length})</h2>
            <button onClick={() => setShowAddBook(!showAddBook)}
              className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> নতুন বই যোগ
            </button>
          </div>

          {showAddBook && (
            <form onSubmit={handleAddBook} className="mb-6 rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="font-bold mb-4">নতুন বই যোগ করুন</h3>
              {/* Writer search */}
              <div className="mb-4 rounded-xl border border-border p-4 bg-muted/30">
                <label className="text-sm font-semibold mb-2 block">লেখকের প্রোফাইল নির্বাচন</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input type="text" placeholder="লেখকের নাম/ইমেইল/মোবাইল..." value={writerSearch}
                    onChange={(e) => { setWriterSearch(e.target.value); searchWriters(e.target.value); }}
                    className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
                {writerSearchResults.length > 0 && !selectedWriter && (
                  <div className="mt-2 rounded-lg border border-border bg-background max-h-40 overflow-y-auto">
                    {writerSearchResults.map((w) => (
                      <button key={w.id} type="button" onClick={() => { setSelectedWriter(w); setAddAuthor(w.name || ""); setWriterSearchResults([]); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted border-b border-border last:border-b-0">
                        <p className="font-medium">{w.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{w.email} • {w.mobile_number || ""}</p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedWriter && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-primary/10 px-4 py-2">
                    <div><p className="text-sm font-medium text-primary">{selectedWriter.name}</p><p className="text-xs text-muted-foreground">{selectedWriter.email}</p></div>
                    <button type="button" onClick={() => { setSelectedWriter(null); setWriterSearch(""); }} className="rounded-lg p-1 hover:bg-background"><X className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input type="text" placeholder="বইয়ের নাম" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} required className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
                <input type="text" placeholder="লেখকের নাম" value={addAuthor} onChange={(e) => setAddAuthor(e.target.value)} required className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
                <select value={addCategoryId} onChange={(e) => setAddCategoryId(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary">
                  <option value="">ক্যাটাগরি</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" placeholder="মূল্য (০ = ফ্রি)" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
              </div>
              <textarea placeholder="বিবরণ" value={addDesc} onChange={(e) => setAddDesc(e.target.value)} rows={2} className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-none" />
              <div className="mt-3">
                <label className="text-sm font-medium mb-1 block">কভার ফটো (ঐচ্ছিক)</label>
                {addCoverPreview && (
                  <div className="relative mb-2 w-24">
                    <img src={addCoverPreview} alt="" className="h-32 w-24 rounded-xl object-cover border border-border" />
                    <button type="button" onClick={() => { setAddCoverPreview(null); setAddCoverFile(null); }} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">✕</button>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setAddCoverFile(file); const reader = new FileReader(); reader.onloadend = () => setAddCoverPreview(reader.result as string); reader.readAsDataURL(file); } }}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-1 file:text-sm file:font-medium file:text-primary-foreground" />
              </div>
              {/* Parts with name */}
              <div className="mt-4">
                <label className="text-sm font-semibold mb-3 block">পর্বসমূহ (সর্বনিম্ন ৩টি)</label>
                <div className="flex flex-col gap-3">
                  {addParts.map((part, index) => (
                    <div key={index} className="rounded-xl border border-border p-3 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <input type="text" value={part.title} onChange={(e) => { const np = [...addParts]; np[index].title = e.target.value; setAddParts(np); }}
                          className="bg-transparent text-sm font-semibold outline-none focus:text-primary flex-1" placeholder={`পর্বের নাম (পর্ব ${index + 1})`} />
                        {addParts.length > 3 && (
                          <button type="button" onClick={() => setAddParts(addParts.filter((_, i) => i !== index))} className="rounded-lg p-1 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                        )}
                      </div>
                      <textarea value={part.content} onChange={(e) => { const np = [...addParts]; np[index].content = e.target.value; setAddParts(np); }}
                        rows={5} placeholder={`পর্ব ${index + 1} এর বিষয়বস্তু...`}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="file"
                          accept=".txt,.pdf,text/plain,application/pdf"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              const { data: { user } } = await supabase.auth.getUser();
                              if (!user) throw new Error("লগইন প্রয়োজন");
                              const marker = await uploadBookPartFile(f, user.id);
                              const np = [...addParts];
                              np[index].content = marker;
                              setAddParts(np);
                            } catch (err: any) {
                              alert("ফাইল আপলোড ব্যর্থ: " + (err?.message || err));
                            } finally {
                              e.target.value = "";
                            }
                          }}
                          className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
                        />
                        <span className="text-[11px] text-muted-foreground">.txt / .pdf আপলোড → Supabase Storage</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setAddParts([...addParts, { title: "", content: "" }])}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full justify-center">
                  <Plus className="h-4 w-4" /> আরও পর্ব যোগ করুন
                </button>
              </div>
              <div className="mt-3 flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={addFeatured} onChange={(e) => setAddFeatured(e.target.checked)} /> নির্বাচিত</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={addIsNew} onChange={(e) => setAddIsNew(e.target.checked)} /> নতুন</label>
              </div>
              <button type="submit" disabled={loading} className="mt-4 rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">যোগ করুন</button>
            </form>
          )}

          {/* Book search */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="বই খুঁজুন..." value={bookSearch} onChange={(e) => setBookSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm outline-none focus:border-primary" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="px-4 py-3 text-left font-semibold">বই</th>
                <th className="px-4 py-3 text-left font-semibold">লেখক</th>
                <th className="px-4 py-3 text-left font-semibold">মূল্য</th>
                <th className="px-4 py-3 text-right font-semibold">কার্যক্রম</th>
              </tr></thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{book.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{book.author}</td>
                    <td className="px-4 py-3">{book.price === 0 ? "ফ্রি" : `৳${book.price}`}</td>
                    <td className="px-4 py-3 text-right flex gap-1 justify-end">
                      <button onClick={() => openAdminBookDetail(book)} className="rounded-lg p-1.5 text-primary hover:bg-primary/10"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => deleteBook(book.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Book Detail Modal (admin) */}
      {viewingBookAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">বইয়ের বিস্তারিত</h3>
              <button onClick={() => setViewingBookAdmin(null)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex gap-4 mb-4">
              {viewingBookAdmin.cover_url ? <img src={viewingBookAdmin.cover_url} alt="" className="h-32 w-24 rounded-xl object-cover flex-shrink-0" />
                : <div className="flex h-32 w-24 items-center justify-center rounded-xl bg-muted flex-shrink-0"><BookOpen className="h-8 w-8 text-muted-foreground" /></div>}
              <div>
                <h4 className="text-xl font-bold">{viewingBookAdmin.title}</h4>
                <p className="text-sm text-muted-foreground">{viewingBookAdmin.author}</p>
                <p className="text-sm font-semibold text-primary mt-2">{viewingBookAdmin.price === 0 ? "ফ্রি" : `৳${viewingBookAdmin.price}`}</p>
              </div>
            </div>
            {viewingBookAdmin.description && !editingBook && <p className="text-sm text-muted-foreground mb-4">{viewingBookAdmin.description}</p>}

            {/* Edit book details */}
            <div className="mb-4 rounded-xl border border-border p-3 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">বইয়ের তথ্য সম্পাদনা</p>
                {!editingBook ? (
                  <button onClick={() => setEditingBook(true)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90">✏️ সম্পাদনা করুন</button>
                ) : (
                  <button onClick={() => setEditingBook(false)} className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/70">বাতিল</button>
                )}
              </div>
              {editingBook && (
                <div className="grid grid-cols-1 gap-3 mt-2">
                  <div>
                    <label className="text-xs font-medium block mb-1">বইয়ের নাম</label>
                    <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">লেখক</label>
                    <input value={editForm.author} onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1">মূল্য (৳)</label>
                      <input type="number" min="0" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1">পৃষ্ঠা সংখ্যা</label>
                      <input type="number" min="0" value={editForm.pages} onChange={(e) => setEditForm({ ...editForm, pages: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">ক্যাটাগরি</label>
                    <select value={editForm.category_id} onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary">
                      <option value="">ক্যাটাগরি নির্বাচন করুন</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">বিস্তারিত</label>
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
                  </div>
                  <button onClick={handleSaveBookEdit} disabled={savingEdit}
                    className="rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    {savingEdit ? "সংরক্ষণ হচ্ছে..." : "💾 সংরক্ষণ করুন"}
                  </button>
                </div>
              )}
            </div>


            {/* Ad-unlock toggle for this book */}
            <div className="mb-4 rounded-xl border border-border p-3 bg-muted/30 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">এড দেখে আনলক</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {viewingBookAdmin.ads_disabled
                    ? "এই বইয়ের জন্য এড আনলক বন্ধ — পাঠকদের শুধু কিনতে হবে।"
                    : "এই বইয়ের পর্ব এড দেখে আনলক করা যাবে।"}
                </p>
              </div>
              <button
                onClick={async () => {
                  const next = !viewingBookAdmin.ads_disabled;
                  const { error } = await supabase.from("books").update({ ads_disabled: next } as any).eq("id", viewingBookAdmin.id);
                  if (error) { alert("ত্রুটি: " + error.message); return; }
                  setViewingBookAdmin({ ...viewingBookAdmin, ads_disabled: next });
                  setBooks((prev) => prev.map((b) => b.id === viewingBookAdmin.id ? { ...b, ads_disabled: next } : b));
                  queryClient.invalidateQueries({ queryKey: ["books"] });
                  queryClient.invalidateQueries({ queryKey: ["book", viewingBookAdmin.id] });
                }}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  viewingBookAdmin.ads_disabled
                    ? "bg-destructive text-destructive-foreground hover:opacity-90"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {viewingBookAdmin.ads_disabled ? "🔓 এড আনলক চালু করুন" : "🚫 এড আনলক বন্ধ করুন"}
              </button>
            </div>


            <h5 className="text-sm font-semibold mb-2">পর্বসমূহ ({adminBookParts.length})</h5>
            <div className="flex flex-col gap-2 mb-4">
              {adminBookParts.map((part) => (
                <div key={part.id} className="rounded-lg border border-border p-3 bg-muted/50">
                  <p className="text-sm font-medium">{part.title || `পর্ব ${part.part_number}`}</p>
                  <p className="text-xs text-muted-foreground mt-1">{part.content?.substring(0, 100)}...</p>
                </div>
              ))}
              {adminBookParts.length === 0 && <p className="text-sm text-muted-foreground">কোনো পর্ব নেই।</p>}
            </div>

            {/* Add new part directly (admin) */}
            <div className="rounded-xl border border-border p-4 bg-background">
              <h5 className="text-sm font-semibold mb-3">নতুন পর্ব যোগ করুন (পর্ব {adminBookParts.length + 1})</h5>
              <input type="text" value={adminNewPartTitle} onChange={(e) => setAdminNewPartTitle(e.target.value)}
                placeholder="পর্বের নাম (ঐচ্ছিক)" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary mb-3" />

              {/* File upload — stored on Supabase Storage, not the database */}
              <div className="mb-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                <label className="text-xs font-semibold text-primary mb-2 block">📎 ফাইল আপলোড করুন (.txt বা .pdf)</label>
                <input
                  type="file"
                  accept=".txt,.pdf,text/plain,application/pdf"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      setAdminAddingPart(true);
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) throw new Error("লগইন প্রয়োজন");
                      const marker = await uploadBookPartFile(f, user.id);
                      setAdminNewPartContent(marker);
                      alert("✅ ফাইল আপলোড সফল — এখন \"পর্ব যোগ করুন\" বাটনে চাপুন");
                    } catch (err: any) {
                      alert("ফাইল আপলোড ব্যর্থ: " + (err?.message || err));
                    } finally {
                      setAdminAddingPart(false);
                      e.target.value = "";
                    }
                  }}
                  className="w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground"
                />
                {adminNewPartContent.startsWith("file::") && (
                  <p className="text-[11px] text-primary mt-2">✅ ফাইল প্রস্তুত (Supabase Storage)</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">ফাইল Supabase ফ্রি ২GB স্টোরেজে যাবে, ডাটাবেজে নয়।</p>
              </div>

              <p className="text-[11px] text-muted-foreground mb-1">অথবা সরাসরি লিখুন:</p>
              <textarea value={adminNewPartContent.startsWith("file::") ? "" : adminNewPartContent} onChange={(e) => setAdminNewPartContent(e.target.value)}
                rows={6} placeholder="পর্বের বিষয়বস্তু লিখুন..." disabled={adminNewPartContent.startsWith("file::")}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-none mb-3 disabled:opacity-50" />
              <button onClick={handleAdminAddPart} disabled={adminAddingPart}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 w-full">
                {adminAddingPart ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} পর্ব যোগ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {activeTab === "categories" && (
        <div>
          <h2 className="text-xl font-bold mb-4">ক্যাটাগরি</h2>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="নতুন ক্যাটাগরি..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            <button onClick={handleAddCategory} className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">যোগ করুন</button>
          </div>
          <div className="flex flex-col gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <span className="font-medium">{cat.name}</span>
                <button onClick={() => deleteCategory(cat.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Writers */}
      {activeTab === "writers" && (
        <div>
          <h2 className="text-xl font-bold mb-4">লেখক তালিকা ({writers.length})</h2>

          {/* Make user a writer */}
          <div className="mb-6 rounded-xl border border-border p-4 bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">ব্যবহারকারীকে লেখক বানান</h3>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="নাম/ইমেইল/মোবাইল দিয়ে সার্চ করুন..." value={makeWriterSearch}
                onChange={(e) => { setMakeWriterSearch(e.target.value); searchUsersForMakeWriter(e.target.value); }}
                className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm outline-none focus:border-primary" />
            </div>
            {makeWriterResults.length > 0 && !makeWriterFormUser && (
              <div className="mt-2 rounded-lg border border-border bg-background max-h-48 overflow-y-auto">
                {makeWriterResults.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-b-0">
                    <div><p className="text-sm font-medium">{u.name || "—"}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                    <button onClick={() => openMakeWriterForm(u)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">লেখক বানান</button>
                  </div>
                ))}
              </div>
            )}

            {/* Make writer form */}
            {makeWriterFormUser && (
              <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold">{makeWriterFormUser.name || makeWriterFormUser.email} কে লেখক বানান</p>
                  <button onClick={() => setMakeWriterFormUser(null)} className="rounded-lg p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input type="text" value={mwName} onChange={(e) => setMwName(e.target.value)} placeholder="লেখকের নাম (পাবলিক প্রোফাইলে দেখাবে) *"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
                  <input type="text" value={mwMobile} onChange={(e) => setMwMobile(e.target.value)} placeholder="মোবাইল নম্বর"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input type="text" value={mwBkash} onChange={(e) => setMwBkash(e.target.value)} placeholder="বিকাশ নম্বর"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input type="text" value={mwHometown} onChange={(e) => setMwHometown(e.target.value)} placeholder="জেলা / শহর"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input type="text" value={mwVillage} onChange={(e) => setMwVillage(e.target.value)} placeholder="গ্রাম"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input type="url" value={mwFbId} onChange={(e) => setMwFbId(e.target.value)} placeholder="ফেসবুক প্রোফাইল লিংক"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input type="url" value={mwFbPage} onChange={(e) => setMwFbPage(e.target.value)} placeholder="ফেসবুক পেজ লিংক"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <button onClick={makeUserWriter} disabled={loading}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null} লেখক হিসেবে নিশ্চিত করুন
                </button>
              </div>
            )}
          </div>

          {writers.length === 0 ? <p className="text-muted-foreground py-10 text-center">কোনো লেখক নেই।</p> : (
            <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="লেখকের নাম দিয়ে সার্চ করুন..." value={writerListSearch}
                onChange={(e) => setWriterListSearch(e.target.value)}
                className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm outline-none focus:border-primary" />
            </div>
             <div className="flex flex-col gap-3">
              {writers.filter((w) => {
                const q = writerListSearch.trim().toLowerCase();
                if (!q) return true;
                return (w.name || "").toLowerCase().includes(q) || (w.email || "").toLowerCase().includes(q) || (w.mobile_number || "").toLowerCase().includes(q);
              }).map((w) => (
                <div key={w.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{w.name || "—"}</h3>
                        {w.writer_blocked && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">ব্লকড</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{w.email}</p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                        {w.mobile_number && <p><span className="font-medium">মোবাইল:</span> {w.mobile_number}</p>}
                        {w.hometown && <p><span className="font-medium">জেলা:</span> {w.hometown}</p>}
                        {w.village && <p><span className="font-medium">গ্রাম:</span> {w.village}</p>}
                        {w.bkash_number && <p><span className="font-medium">বিকাশ:</span> {w.bkash_number}</p>}
                        {w.facebook_id && <p><span className="font-medium">ফেসবুক:</span> <a href={w.facebook_id.startsWith("http") ? w.facebook_id : `https://facebook.com/${w.facebook_id}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">প্রোফাইল</a></p>}
                        {w.facebook_page && <p><span className="font-medium">পেজ:</span> <a href={w.facebook_page.startsWith("http") ? w.facebook_page : `https://facebook.com/${w.facebook_page}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">পেজ</a></p>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <button onClick={async () => { setViewingWriterBooks(w); await fetchWriterBooks(w.id); }}
                        className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
                        <BookOpen className="h-3 w-3 inline mr-1" /> বই দেখুন
                      </button>
                      <button onClick={() => toggleWriterBlock(w)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${w.writer_blocked ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-destructive text-destructive-foreground hover:opacity-90"}`}>
                        {w.writer_blocked ? "আনব্লক" : "ব্লক"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          {/* Writer books modal */}
          {viewingWriterBooks && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{viewingWriterBooks.name} এর বই</h3>
                  <button onClick={() => setViewingWriterBooks(null)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
                </div>
                {writerBooksData.length === 0 ? <p className="text-muted-foreground py-6 text-center">কোনো বই নেই।</p> : (
                  <div className="flex flex-col gap-3">
                    {writerBooksData.map((book: any) => (
                      <div key={book.id} className="rounded-xl border border-border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {book.cover_url ? <img src={book.cover_url} alt="" className="h-14 w-10 rounded-lg object-cover" />
                            : <div className="flex h-14 w-10 items-center justify-center rounded-lg bg-muted"><BookOpen className="h-5 w-5 text-muted-foreground" /></div>}
                          <div>
                            <p className="font-bold">{book.title}</p>
                            <p className="text-xs text-muted-foreground">{book.price === 0 ? "ফ্রি" : `৳${book.price}`}</p>
                          </div>
                        </div>
                        <button onClick={() => { setViewingWriterBooks(null); openAdminBookDetail(book); }}
                          className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium hover:bg-muted/80">
                          <Eye className="h-3 w-3 inline mr-1" /> বিস্তারিত / পর্ব যোগ
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {activeTab === "users" && (
        <div>
          <h2 className="text-xl font-bold mb-4">ব্যবহারকারী ({users.length})</h2>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="ব্যবহারকারীর নাম দিয়ে সার্চ করুন..." value={userListSearch}
              onChange={(e) => setUserListSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm outline-none focus:border-primary" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="px-4 py-3 text-left font-semibold">নাম</th>
                <th className="px-4 py-3 text-left font-semibold">ইমেইল</th>
                <th className="px-4 py-3 text-left font-semibold">যোগদান</th>
                <th className="px-4 py-3 text-left font-semibold">অবস্থা</th>
                <th className="px-4 py-3 text-right font-semibold">অ্যাকশন</th>
              </tr></thead>
              <tbody>
                {users.filter((u) => {
                  const q = userListSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || (u.mobile_number || "").toLowerCase().includes(q);
                }).map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("bn-BD")}</td>
                    <td className="px-4 py-3">
                      {u.is_blocked
                        ? <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">ব্লকড</span>
                        : <span className="text-xs text-muted-foreground">সক্রিয়</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleUserBlock(u)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${u.is_blocked ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-destructive text-destructive-foreground hover:opacity-90"}`}>
                        {u.is_blocked ? "আনব্লক" : "ব্লক"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Featured */}
      {activeTab === "featured" && (
        <div>
          <h2 className="text-xl font-bold mb-4">নির্বাচিত বই</h2>
          <div className="flex flex-col gap-2">
            {books.map((book) => (
              <div key={book.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  {book.cover_url ? <img src={book.cover_url} alt="" className="h-12 w-8 rounded object-cover" />
                    : <div className="flex h-12 w-8 items-center justify-center rounded bg-muted"><BookOpen className="h-4 w-4 text-muted-foreground" /></div>}
                  <div><p className="font-medium">{book.title}</p><p className="text-xs text-muted-foreground">{book.author}</p></div>
                </div>
                <button onClick={() => toggleFeatured(book.id, !!book.featured)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${book.featured ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"}`}>
                  {book.featured ? "⭐ নির্বাচিত" : "নির্বাচন করুন"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders */}
      {activeTab === "orders" && (
        <div>
          <h2 className="text-xl font-bold mb-4">বই অর্ডার ({orders.length})</h2>
          {pendingOrders.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">⏳ অপেক্ষমান ({pendingOrders.length})</h3>
              <div className="flex flex-col gap-3">
                {pendingOrders.map((order: any) => (
                  <div key={order.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold">{order.book?.title || "অজানা বই"}</h4>
                        <p className="text-sm text-muted-foreground">ক্রেতা: {order.buyer?.name || order.buyer?.email || "অজানা"}</p>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                          <p><span className="font-medium">TrxID:</span> <span className="font-mono">{order.transaction_id}</span></p>
                          <p><span className="font-medium">মোবাইল:</span> {order.mobile_number}</p>
                          <p><span className="font-medium">৳:</span> {order.amount}</p>
                          <p><span className="font-medium">তারিখ:</span> {new Date(order.created_at).toLocaleDateString("bn-BD")}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => confirmOrder(order.id)} disabled={loading}
                          className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} কনফার্ম
                        </button>
                        <button onClick={() => rejectOrder(order.id)} disabled={loading}
                          className="flex items-center gap-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50">
                          <X className="h-4 w-4" /> বাতিল
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {orders.filter((o: any) => o.status !== "pending").length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">সকল অর্ডার</h3>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr>
                    <th className="px-4 py-3 text-left font-semibold">বই</th>
                    <th className="px-4 py-3 text-left font-semibold">ক্রেতা</th>
                    <th className="px-4 py-3 text-left font-semibold">TrxID</th>
                    <th className="px-4 py-3 text-left font-semibold">৳</th>
                    <th className="px-4 py-3 text-left font-semibold">স্ট্যাটাস</th>
                  </tr></thead>
                  <tbody>
                    {orders.filter((o: any) => o.status !== "pending").map((order: any) => (
                      <tr key={order.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{order.book?.title || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{order.buyer?.name || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{order.transaction_id}</td>
                        <td className="px-4 py-3">৳{order.amount}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${order.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                            {order.status === "confirmed" ? "কনফার্মড" : "বাতিল"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {orders.length === 0 && <p className="text-muted-foreground py-10 text-center">কোনো অর্ডার নেই।</p>}
        </div>
      )}

      {/* bKash Settings */}
      {activeTab === "bkash" && !bkashUnlocked && (
        <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-6 shadow-card mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">অতিরিক্ত সুরক্ষা</h2>
              <p className="text-xs text-muted-foreground">বিকাশ সেটিংস দেখতে পাসওয়ার্ড দিন।</p>
            </div>
          </div>
          <input
            type="password"
            value={bkashPwInput}
            onChange={(e) => { setBkashPwInput(e.target.value); setBkashPwError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") tryUnlockBkash(); }}
            placeholder="পাসওয়ার্ড"
            autoFocus
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {bkashPwError && <p className="mt-2 text-xs text-destructive">{bkashPwError}</p>}
          <button onClick={tryUnlockBkash}
            className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">
            আনলক করুন
          </button>
        </div>
      )}

      {activeTab === "bkash" && bkashUnlocked && (
        <div>
          <h2 className="text-xl font-bold mb-4">বিকাশ পেমেন্ট সেটিংস</h2>
          <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-bold mb-4">নতুন বিকাশ নম্বর যোগ করুন</h3>
            <div className="flex flex-col gap-3">
              <input type="text" placeholder="বিকাশ নম্বর (01XXXXXXXXX)" value={newBkashNumber} onChange={(e) => setNewBkashNumber(e.target.value)}
                className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
              <div>
                <label className="text-sm font-medium mb-1 block">QR কোড ছবি (ঐচ্ছিক)</label>
                <input type="file" accept="image/*" onChange={(e) => setNewBkashQrFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-1 file:text-sm file:font-medium file:text-primary-foreground" />
              </div>
              <button onClick={handleAddBkash} disabled={loading}
                className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null} যোগ করুন
              </button>
            </div>
          </div>

          {bkashSettings.length === 0 ? <p className="text-muted-foreground py-10 text-center">কোনো বিকাশ নম্বর যোগ করা হয়নি।</p> : (
            <div className="flex flex-col gap-3">
              {bkashSettings.map((s: any) => (
                <div key={s.id} className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {s.bkash_qr_url && <img src={s.bkash_qr_url} alt="QR" className="h-16 w-16 rounded-lg object-contain border border-border" />}
                    <div>
                      <p className="font-bold text-lg">{s.bkash_number}</p>
                      <p className="text-xs text-muted-foreground">{s.is_active ? "✅ সক্রিয়" : "❌ নিষ্ক্রিয়"}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteBkash(s.id)} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Withdrawals */}
      {activeTab === "withdrawals" && (
        <div>
          <h2 className="text-xl font-bold mb-4">উইথড্র অনুরোধ ({withdrawals.length})</h2>
          {pendingWithdrawals.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">⏳ অপেক্ষমান ({pendingWithdrawals.length})</h3>
              <div className="flex flex-col gap-3">
                {pendingWithdrawals.map((w: any) => (
                  <div key={w.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-extrabold text-primary">৳{w.amount}</p>
                          <span className="text-xs rounded-lg bg-muted px-2 py-0.5 font-semibold">
                            {w.method === "bkash" ? "📱 বিকাশ" : "📱 নগদ"}
                          </span>
                        </div>
                        <p className="text-sm mt-1"><span className="font-medium">পেআউট নম্বর:</span> <span className="font-mono">{w.payout_number}</span></p>
                        <p className="text-sm"><span className="font-medium">ব্যবহারকারী:</span> {w.user?.name || w.user?.email || "অজানা"}</p>
                        {w.note && <p className="text-xs text-muted-foreground mt-1">নোট: {w.note}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(w.created_at).toLocaleString("bn-BD")}</p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => setWithdrawalStatus(w.id, "paid")} disabled={loading}
                          className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} পরিশোধিত
                        </button>
                        <button onClick={() => setWithdrawalStatus(w.id, "rejected")} disabled={loading}
                          className="flex items-center gap-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50">
                          <X className="h-4 w-4" /> বাতিল
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {withdrawals.filter((w: any) => w.status !== "pending").length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">পূর্ববর্তী</h3>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted"><tr>
                    <th className="px-4 py-3 text-left font-semibold">ব্যবহারকারী</th>
                    <th className="px-4 py-3 text-left font-semibold">৳</th>
                    <th className="px-4 py-3 text-left font-semibold">নম্বর</th>
                    <th className="px-4 py-3 text-left font-semibold">স্ট্যাটাস</th>
                    <th className="px-4 py-3 text-left font-semibold">তারিখ</th>
                  </tr></thead>
                  <tbody>
                    {withdrawals.filter((w: any) => w.status !== "pending").map((w: any) => (
                      <tr key={w.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{w.user?.name || w.user?.email || "—"}</td>
                        <td className="px-4 py-3">৳{w.amount}</td>
                        <td className="px-4 py-3 font-mono text-xs">{w.method}: {w.payout_number}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${w.status === "paid" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                            {w.status === "paid" ? "পরিশোধিত" : "বাতিল"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(w.processed_at || w.created_at).toLocaleDateString("bn-BD")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {withdrawals.length === 0 && <p className="text-muted-foreground py-10 text-center">কোনো উইথড্র অনুরোধ নেই।</p>}
        </div>
      )}

      {/* App install tracking */}
      {activeTab === "installs" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">অ্যাপ ডাউনলোড / ইনস্টল ট্র্যাকিং</h2>
              <p className="text-sm text-muted-foreground">মোট রেকর্ড: {installCount}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => { fetchInstallCount(); fetchAppInstalls(); }}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
                <Smartphone className="h-4 w-4" /> রিফ্রেশ
              </button>
              <button onClick={resetAppInstalls} disabled={resettingInstalls}
                className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-50">
                {resettingInstalls ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} রিসেট (সব মুছুন)
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 mb-6">
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-xs text-muted-foreground">মোট ইনস্টল/ক্লিক</p>
              <p className="text-3xl font-extrabold text-primary">{installCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-xs text-muted-foreground">আজ</p>
              <p className="text-3xl font-extrabold text-primary">
                {appInstalls.filter((i: any) => new Date(i.installed_at).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <p className="text-xs text-muted-foreground">লগইন ইউজার</p>
              <p className="text-3xl font-extrabold text-primary">{appInstalls.filter((i: any) => i.user_id).length}</p>
            </div>
          </div>
          {appInstalls.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">এখনো কোনো অ্যাপ ইনস্টল/ক্লিক রেকর্ড নেই।</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr>
                  <th className="px-4 py-3 text-left font-semibold">তারিখ</th>
                  <th className="px-4 py-3 text-left font-semibold">ইউজার</th>
                  <th className="px-4 py-3 text-left font-semibold">ডিভাইস / ব্রাউজার</th>
                </tr></thead>
                <tbody>
                  {appInstalls.map((item: any) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(item.installed_at).toLocaleString("bn-BD")}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.user_id ? "লগইন ইউজার" : "গেস্ট"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xl truncate">{item.user_agent || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tools — text-to-file converter */}
      {activeTab === "tools" && (
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold mb-2">টেক্সট → ফাইল কনভার্টার</h2>
          <p className="text-sm text-muted-foreground mb-4">
            টেক্সট লিখুন বা পেস্ট করুন, ক্লিন .txt ফাইল ডাউনলোড করুন। কোনো ক্লাউড স্টোরেজ
            ব্যবহার হবে না — ফাইল সরাসরি ব্রাউজার থেকেই তৈরি হবে।
          </p>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card flex flex-col gap-3">
            <input
              type="text"
              value={t2fName}
              onChange={(e) => setT2fName(e.target.value)}
              placeholder="ফাইলের নাম (যেমন: boi-1-part-3)"
              className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <textarea
              value={t2fText}
              onChange={(e) => setT2fText(e.target.value)}
              rows={14}
              placeholder="এখানে পর্বের টেক্সট পেস্ট করুন..."
              className="rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-y"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t2fText.length} অক্ষর • আনুমানিক ফাইল সাইজ: {Math.ceil(new Blob([t2fText]).size / 1024)} KB</span>
              <button
                onClick={downloadTextAsFile}
                disabled={!t2fText.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> ফাইল ডাউনলোড
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
