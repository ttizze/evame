// // app/api/users/route.ts
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// export async function GET() {
//   try {
//     const users = await prisma.user.findMany({
//       select: {
//         handle: true,
//       },
//     });

//     return NextResponse.json(users, {
//       headers: {
//         "Cache-Control": "public, max-age=86400",
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     return new NextResponse("Internal Server Error", { status: 500 });
//   }
// }
