project(kotekan_dpdk)

find_package(NUMA REQUIRED)

add_library(kotekan_dpdk dpdkCore.cpp zeroSamples.cpp invalidateVDIFframes.cpp)

if(DPDK_FOUND)
    # The new way to include DPDK with pkg-config
    add_definitions(${DPDK_STATIC_CFLAGS})
    set(DPDK_LIBRARIES ${DPDK_STATIC_LDFLAGS})
    message(STATUS "DPDK include dirs: ${DPDK_INCLUDE_DIRS}")
    target_include_directories(kotekan_dpdk SYSTEM PRIVATE ${DPDK_INCLUDE_DIRS})
else()
    # Link in DPDK with the find script
    find_package(DPDK REQUIRED)
    message("DPDK include dir: ${DPDK_INCLUDE_DIR}")
    target_include_directories(kotekan_dpdk SYSTEM PRIVATE ${DPDK_INCLUDE_DIR})
endif()

target_link_libraries(kotekan_dpdk PRIVATE ${DPDK_LIBRARIES} ${NUMA_LIBRARY} libexternal
                                           kotekan_libs)
target_include_directories(kotekan_dpdk PUBLIC .)
