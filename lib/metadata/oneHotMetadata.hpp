#ifndef ONEHOT_METADATA
#define ONEHOT_METADATA

#include "chimeMetadata.hpp"
#include "Telescope.hpp"
#include "buffer.h"
#include "datasetManager.hpp"
#include "metadata.h"

#include <vector>

#include <sys/time.h>

#pragma pack()

struct oneHotMetadata {
	struct chimeMetadata chime;
	std::vector<int> hotIndices;
};

inline bool metadata_is_onehot(struct Buffer* buf, int frame_id) {
	std::cout << "metadata type name: " << buf->metadata_pool->type_name << std::endl;
	return strcmp(buf->metadata_pool->type_name, "oneHotMetadata") == 0;
}

inline void set_onehot_indices(struct Buffer* buf, int frame_id, std::vector<int> indices) {
    struct oneHotMetadata* m = (struct oneHotMetadata*)buf->metadata[frame_id]->metadata;
    m->hotIndices = indices;
}

inline std::vector<int> get_onehot_indices(struct Buffer* buf, int frame_id) {
    struct oneHotMetadata* m = (struct oneHotMetadata*)buf->metadata[frame_id]->metadata;
    return m->hotIndices;
}

#endif
