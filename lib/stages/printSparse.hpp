#ifndef PRINT_SPARSE_H
#define PRINT_SPARSE_H

#include "Config.hpp"          // for Config
#include "Stage.hpp"           // for Stage
#include "buffer.h"            // for Buffer, mark_frame_empty, register_consumer, wait_for_ful...
#include "bufferContainer.hpp" // for bufferContainer
#include "errors.h"            // for TEST_PASSED
#include "kotekanLogging.hpp"  // for DEBUG, INFO, ERROR, FATAL_ERROR
#include "oneHotMetadata.hpp"

#include <assert.h>    // for assert
#include <cstdint>     // for int32_t, uint8_t, uint32_t
#include <exception>   // for exception
#include <functional>  // for bind
#include <limits>      // for numeric_limits
#include <regex>       // for match_results<>::_Base_type
#include <stdexcept>   // for runtime_error
#include <stdlib.h>    // for abs
#include <string>      // for string, allocator
#include <type_traits> // for is_same, enable_if
#include <vector>      // for vector


template<typename A_Type>
class printSparse : public kotekan::Stage {
public:
    printSparse(kotekan::Config& config, const std::string& unique_name,
                  kotekan::bufferContainer& buffer_container);
    ~printSparse();
    void main_thread() override;

private:
    struct Buffer* buf;
    int _max;
    std::vector<int> _array_shape;
};

template<typename A_Type>
printSparse<A_Type>::printSparse(kotekan::Config& config, const std::string& unique_name,
                                     kotekan::bufferContainer& buffer_container) :
    kotekan::Stage(config, unique_name, buffer_container,
                   std::bind(&printSparse::main_thread, this)) {
    buf = get_buffer("input_buf");
    register_consumer(buf, unique_name.c_str());

    _max = config.get_default<int>(unique_name, "max_to_print", 0);
    _array_shape = config.get_default<std::vector<int>>(unique_name, "array_shape", std::vector<int>());
    if (_array_shape.size()) {
        size_t sz = sizeof(A_Type);
        for (int s: _array_shape)
            sz *= s;
        if (sz != buf->frame_size) {
            throw std::invalid_argument("printSparse: product of 'array_shape' config setting must equal the buffer frame size");
        }
    }

}

template<typename A_Type>
printSparse<A_Type>::~printSparse() {}

template<typename A_Type>
void printSparse<A_Type>::main_thread() {
    int buf_id = 0;
    while (!stop_thread) {

        // Get frame
        const A_Type* frame = (A_Type*)wait_for_full_frame(buf, unique_name.c_str(), buf_id);
        if (frame == nullptr)
            break;
        INFO("printSparse: checking {:s}[{:d}]", buf->buffer_name, buf_id);

        int frame_counter = 0;
        if (metadata_is_onehot(buf, buf_id))
            frame_counter = get_onehot_frame_counter(buf, buf_id);

        int nset = 0;
        for (uint32_t i = 0; i < buf->frame_size/sizeof(A_Type); ++i) {
            if (!frame[i])
                continue;
            nset++;
            if ((_max > 0) && (nset >= _max))
                continue;
            if (_array_shape.size()) {
                uint32_t j = i;
                bool first = true;
                std::string istring = "";
                for (auto it=_array_shape.rbegin(); it != _array_shape.rend(); it++) {
                    int n = (*it);
                    // prepend the index to the string
                    istring = std::to_string(j % n) + (first ? "" : ", ") + istring;
                    first = false;
                    j /= n;
                }
                INFO("printSparse: {:s}[{:d}] element {:s} ({:d} = 0x{:x}) has value {} = 0x{:x}",
                     buf->buffer_name, buf_id, istring, i, i, frame[i], frame[i]);
                if (nset == 1)
                    INFO("PY sparse[\"{:s}\"][{:d}] = (({:s}), 0x{:x})", buf->buffer_name, frame_counter,
                         istring, frame[i]);
            } else {
                INFO("printSparse: {:s}[{:d}] element {:d} = 0x{:x} has value {} = 0x{:x}",
                     buf->buffer_name, buf_id, i, i, frame[i], frame[i]);
            }
        }

        INFO("printSparse: {:s}[{:d}] has {:d} elements set.", buf->buffer_name, buf_id, nset);
        if (nset == 0) {
            INFO("PY sparse[\"{:s}\"][{:d}] = (None, 0)", buf->buffer_name, frame_counter);
        }

        mark_frame_empty(buf, unique_name.c_str(), buf_id);
        buf_id = (buf_id + 1) % buf->num_frames;
    }
}

#endif
