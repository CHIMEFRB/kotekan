#include <pthread.h>
#include <sched.h>
#include "errors.h"

#include "KotekanProcess.hpp"

KotekanProcess::KotekanProcess(Config &config,
                std::function<void(const KotekanProcess&)> main_thread_ref) :
    stop_thread(false), config(config),
    this_thread(), main_thread_fn(main_thread_ref) {

    set_cpu_affinity(config.get_int_array("/processing/cpu_affinity"));
}

void KotekanProcess::apply_cpu_affinity() {
    int err = 0;

    std::lock_guard<std::mutex> lock(cpu_affinity_lock);

    // Don't set the thread affinity if the thread hasn't been created yet.
    if(!this_thread.joinable())
        return;

#ifndef MAC_OSX
    cpu_set_t cpuset;
    CPU_ZERO(&cpuset);
    INFO("Setting thread affinity");
    for (auto &i : cpu_affinity)
        CPU_SET(i, &cpuset);

    err = pthread_setaffinity_np(this_thread.native_handle(), sizeof(cpu_set_t), &cpuset);
#endif
    
    // Need to add thread name
    if (err)
        ERROR("Failed to set thread affinity for ..., error code %d", err);
}

void KotekanProcess::set_cpu_affinity(const std::vector<int> &cpu_affinity_) {
    {
        std::lock_guard<std::mutex> lock(cpu_affinity_lock);
        cpu_affinity = cpu_affinity_;
    }
    apply_cpu_affinity();
}

void KotekanProcess::start() {
    this_thread = std::thread(main_thread_fn, std::ref(*this));

    apply_cpu_affinity();
}

void KotekanProcess::join() {
    if (this_thread.joinable())
        this_thread.join();
}

void KotekanProcess::stop() {
    stop_thread = true;
}

void KotekanProcess::main_thread() {}

KotekanProcess::~KotekanProcess() {
    stop_thread = true;
    if (this_thread.joinable())
        this_thread.join();
}

