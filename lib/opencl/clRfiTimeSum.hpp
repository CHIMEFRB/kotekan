/*
 * @file clRfiTimeSum.hpp
 * @brief open cl GPU command to integrate square power across time.
 *  - clRfiTimeSum : public gpu_command
 */
#ifndef CL_RFI_TIME_SUM_HPP
#define CL_RFI_TIME_SUM_HPP

#include <mutex>
#include <vector>
#include "gpu_command.h"
#include "device_interface.h"
#include "restServer.hpp"

/*
 * @class clRfiTimeSum
 * @brief ``gpu_command`` which read the input data and integrates square power values for further processing.
 *
 * This gpu command executes the rfi_chime_timsum_private.cl kernel. The kernel reads input data, computes power
 * and square power values. The kernel integrates those values and outputs a normalized sum of square power values.
 *
 * @par GPU Memory
 * @gpu_mem InputBuffer The kotekan buffer containing input data to be read by the command.
 *      @gpu_mem_type              staging
 *      @gpu_mem_format            Array of @c uint8_t
 * @gpu_mem RfiTimeSumBuffer A gpu memory object which holds the normalized square power values
 *      @gpu_mem_type              static
 *      @gpu_mem_format            Array of @c float
 *
 * @author Jacob Taylor
 */
class clRfiTimeSum: public gpu_command
{
public:
    //Constructor
    clRfiTimeSum(const char* param_gpuKernel, const char* param_name, Config &config, const string &unique_name);
    //Destructor
    ~clRfiTimeSum();
    //Builds the program/kernel
    virtual void build(device_interface &param_Device) override;
    //Executes the kernel
    virtual cl_event execute(int param_bufferID, const uint64_t& fpga_seq, device_interface &param_Device, cl_event param_PrecedeEvent) override;
    //Rest Server Callback
    void rest_callback(connectionInstance& conn, json& json_request);
protected:
    //Applies config parameters
    void apply_config(const uint64_t& fpga_seq) override;
private:
    //RFI parameters
    /// The kurtosis step (How many timesteps per kurtosis estimate)
    uint32_t _sk_step;
    /// A vector holding all of the bad inputs
    vector<int32_t> bad_inputs;
    /// Mutex for rest server callback
    std::mutex rest_callback_mutex;
    /// A open cl memory object for the input mask
    cl_mem mem_input_mask;
    /// The length of the input mask in bytes
    uint32_t mask_len;
    /// Flag for rebuilding input mask after rest server callback
    bool rebuildInputMask;
    /// The input mask array
    uint8_t * Input_Mask;
};

#endif
