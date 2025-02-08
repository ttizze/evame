// switch (submission.value.intent) {
//   case TranslationIntent.TRANSLATE_COMMENT: {
//     const pageWithComments = await fetchPageWithTitleAndComments(
//       submission.value.pageId,
//     );
//     if (!pageWithComments) {
//       return {
//         lastResult: submission.reply({
//           formErrors: ["Page not found"],
//         }),
//         slug: null,
//       };
//     }

//     const userAITranslationInfo = await createUserAITranslationInfo(
//       currentUser.id,
//       pageWithComments.id,
//       submission.value.aiModel,
//       locale,
//     );

//     const commentsSegmentsArray = pageWithComments.pageComments.map(
//       (comment) => {
//         const segments = comment.pageCommentSegments.map((segment) => ({
//           number: segment.number,
//           text: segment.text,
//         }));
//         //titleを追加しておく
//         segments.push({
//           number: 0,
//           text: pageWithComments.pageSegments[0].text,
//         });

//         return {
//           commentId: comment.id,
//           segments,
//         };
//       },
//     );
//     for (const comment of commentsSegmentsArray) {
//       const queue = getTranslateUserQueue(currentUser.id);
//       await queue.add(`translate-${currentUser.id}`, {
//         userAITranslationInfoId: userAITranslationInfo.id,
//         geminiApiKey: geminiApiKey.apiKey,
//         aiModel: submission.value.aiModel,
//         userId: currentUser.id,
//         pageId: pageWithComments.id,
//         locale: locale,
//         title: pageWithComments.pageSegments[0].text,
//         numberedElements: comment.segments,
//         translationIntent: TranslationIntent.TRANSLATE_COMMENT,
//         commentId: comment.commentId,
//       });
//     }
//     return {
//       lastResult: submission.reply({ resetForm: true }),
//       slug: null,
//     };
//   }
