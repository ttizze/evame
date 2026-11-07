#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

// UTF-8とバイト数を渡す。置換なしはNULLと0。失敗はNULL、成功は所有権付きJSON。
char *evame_comrak_probe(const uint8_t *source, size_t source_len, bool gfm,
                        const uint8_t *replacement, size_t replacement_len);
void evame_comrak_probe_free(char *result);
