#ifndef KOTEKAN_CUDA_COPYFROMRINGBUFFER_HPP
#define KOTEKAN_CUDA_COPYFROMRINGBUFFER_HPP

#include "cudaCommand.hpp"
#include "cudaDeviceInterface.hpp"

/**
 * @class cudaCopyFromRingbuffer
 * @brief cudaCommand for copying GPU frames from a ringbuffer.
 *
 * @author Dustin Lang
 *
 * @par GPU Memory
 * @gpu_mem  gpu_mem_input  Input matrix of data (of unspecified type)
 *   @gpu_mem_type   staging
 *   @gpu_mem_format array of raw bytes
 * @gpu_mem  gpu_mem_output Output matrix of data (of unspecified type)
 *   @gpu_mem_type   staging
 *   @gpu_mem_format Array of raw bytes
 *
 * xxxxx @conf input_size - Int
 *
 */
class cudaCopyFromRingbuffer : public cudaCommand {
public:
    cudaCopyFromRingbuffer(kotekan::Config& config, const std::string& unique_name,
                           kotekan::bufferContainer& host_buffers, cudaDeviceInterface& device);

    int wait_on_precondition(int gpu_frame_id) override;

    cudaEvent_t execute(cudaPipelineState& pipestate,
                        const std::vector<cudaEvent_t>& pre_events) override;

    void finalize_frame(int gpu_frame_id) override;

protected:
private:
    size_t _output_size;
    size_t _ring_buffer_size;

    size_t input_cursor;

    /// GPU side memory name for the time-stream input
    std::string _gpu_mem_input;
    /// GPU side memory name for the time-stream output
    std::string _gpu_mem_output;

    // Host side signalling buffer
    RingBuffer* signal_buffer;
};

#endif // KOTEKAN_CUDA_COPYFROMRINGBUFFER_HPP
