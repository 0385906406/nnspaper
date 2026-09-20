// Tính lại chuỗi tìm kiếm (searchText) cho mọi hình nền — chạy một lần sau khi
// nâng cấp tìm kiếm, hoặc bất cứ khi nào sửa dữ liệu thẳng trong DB.
// Chạy: npm run seed:search

import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Thiếu MONGODB_URI. Hãy tạo .env.local từ .env.example trước.");
  process.exit(1);
}

// Bản sao của normalizeSearch/buildSearchText trong src/lib/search-text.ts — giữ khớp nhau
function foldChars(value) {
  let out = "";
  for (const ch of value.toLowerCase()) {
    if (ch === "đ") {
      out += "d";
      continue;
    }
    const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    out += base.length === 1 ? base : " ";
  }
  return out;
}

function normalizeSearch(value) {
  return foldChars(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function buildSearchText(doc) {
  return normalizeSearch(
    [doc.title, ...(doc.tags ?? []), doc.categoryName, doc.description].filter(Boolean).join(" ")
  );
}

async function main() {
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
  const col = mongoose.connection.db.collection("wallpapers");

  const docs = await col
    .find({}, { projection: { title: 1, tags: 1, categoryName: 1, description: 1, searchText: 1 } })
    .toArray();
  const ops = docs
    .map((d) => ({ d, text: buildSearchText(d) }))
    .filter(({ d, text }) => d.searchText !== text)
    .map(({ d, text }) => ({ updateOne: { filter: { _id: d._id }, update: { $set: { searchText: text } } } }));

  if (ops.length) await col.bulkWrite(ops);
  console.log(`Cập nhật chuỗi tìm kiếm cho ${ops.length}/${docs.length} hình nền.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
