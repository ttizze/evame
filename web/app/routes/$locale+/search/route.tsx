import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";
import { authenticator } from "~/utils/auth.server";
import { searchByCategory } from "./functions/queries.server";
import { FileText, User, Tag, Edit3 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { data } from "@remix-run/node";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "~/components/ui/tabs";
import { PaginationBar } from "~/components/PaginationBar";

// カテゴリー定義
export const CATEGORIES = ["title", "user", "tags", "content"] as const;
export type Category = (typeof CATEGORIES)[number];

// Zod スキーマ
const schema = z.object({
  query: z.string().min(1, "Search query is required"),
  category: z.enum(CATEGORIES),
});

// ページサイズ
const PAGE_SIZE = 10;

export const meta: MetaFunction = () => {
  return [
    { title: "Search" },
    { name: "robots", content: "noindex" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const currentUser = await authenticator.isAuthenticated(request);
  const url = new URL(request.url);

  // 検索パラメータ
  const formData = Object.fromEntries(url.searchParams.entries());
  const page = parseInt(formData.page || "1", 10);

  // Zod バリデーション
  const submission = parseWithZod(new URLSearchParams(formData), { schema });
  if (submission.status !== "success") {
    // バリデーションNGなら結果なし
    return {
      currentUser,
      query: "",
      category: "title",
      results: {
        results: [],
        totalPages: 0,
        currentPage: 0,
      },
      page,
    };
  }

  const { query, category } = submission.value;
  const skip = (page - 1) * PAGE_SIZE;
  const take = PAGE_SIZE;

  // カテゴリに応じて検索
  const results = await searchByCategory(query, category, skip, take);

  return data(
    {
      currentUser,
      query,
      category,
      results,
      page,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3000, s-maxage=3600",
      },
    }
  );
}

export default function SearchPage() {
  const {
    query,
    category,
    results,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentCategory, setCurrentCategory] = useState<Category>(
    category as Category
  );
  function renderCategoryIcon(cat: Category) {
    switch (cat) {
      case "title":
        return <FileText className="mr-1 h-4 w-4" />;
      case "user":
        return <User className="mr-1 h-4 w-4" />;
      case "tags":
        return <Tag className="mr-1 h-4 w-4" />;
      case "content":
        return <Edit3 className="mr-1 h-4 w-4" />;
      default:
        return null;
    }
  }

  function handlePageChange(newPage: number) {
    setSearchParams({
      query,
      category: currentCategory,
      page: String(newPage),
    });
  }

  return (
    <div className="container mx-auto p-4">
      {/* 検索フォーム (method="get") */}
      <Form method="get" className="mb-6">
        <input type="hidden" name="category" value={currentCategory} />
        <div className="relative">
          <Input
            type="search"
            name="query"
            defaultValue={query}
            placeholder="Search..."
            className="w-full px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Form>

      {/* カテゴリ切り替え (Tabs) */}
      <Tabs
        value={currentCategory}
        onValueChange={(val) => {
          setCurrentCategory(val as Category);
          setSearchParams({
            query: searchParams.get("query") ?? "",
            category: val,
          });
        }}
      >
        <TabsList className="mb-6 border-b w-full flex rounded-full">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="flex-1 items-center justify-center rounded-full text-sm"
            >
              {renderCategoryIcon(cat)}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        {CATEGORIES.map((cat) => (
          <TabsContent key={cat} value={cat} />
        ))}
      </Tabs>

      {/* 検索結果 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold mb-4">Search Results</h2>
        {results.results.length === 0 ? (
          <p className="text-gray-500">No results found.</p>
        ) : (
          <div className="space-y-4">
            {results.results.map((item: any) => {
              if (currentCategory === "tags") {
                // Tag の結果: { id, name }
                return (
                  <div
                    key={item.id}
                    className="flex items-start p-4 hover:bg-gray-50 rounded-lg transition"
                  >
                    <div className="mr-4 text-2xl">🏷️</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {item.name}
                      </h3>
                    </div>
                  </div>
                );
              } else if (currentCategory === "user") {
                // User の結果: { id, displayName, userName, ... }
                return (
                  <div
                    key={item.id}
                    className="flex items-start p-4 hover:bg-gray-50 rounded-lg transition"
                  >
                    <div className="mr-4 text-2xl">👤</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {item.displayName || item.userName}
                      </h3>
                    </div>
                  </div>
                );
              } else {
                // title / content は Page
                // { id, slug, content, updatedAt, user: {...}, tagPages: [{ tag: {...} }] }
                return (
                  <div
                    key={item.id}
                    className="flex items-start p-4 hover:bg-gray-50 rounded-lg transition"
                  >
                    <div className="mr-4 text-2xl">
                      {currentCategory === "title" ? "📄" : "📝"}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {item.slug}
                      </h3>
                      <div className="text-sm text-gray-500 mt-1">
                        By: {item.user?.displayName || item.user?.userName}
                      </div>
                      {item.tagPages?.length > 0 && (
                        <p className="text-sm text-gray-500">
                          Tags:{" "}
                          {item.tagPages
                            .map((tp: any) => tp.tag.name)
                            .join(", ")}
                        </p>
                      )}
                      {item.content && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.content.slice(0, 100)}...
                        </p>
                      )}
                      {item.updatedAt && (
                        <div className="text-xs text-gray-400 mt-2">
                          Last updated:{" "}
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* 簡易ページャー */}
      <div className="mt-4 flex items-center gap-4">
      <PaginationBar
          totalPages={results.totalPages}
          currentPage={results.currentPage}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
